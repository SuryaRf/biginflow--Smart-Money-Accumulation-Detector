#!/usr/bin/env python3
"""
IDX Broker Summary Scraper (Aggregate Data + Price)
Scrapes aggregate broker participation data and stock prices from IDX.

Usage:
    py scripts/scraper.py                    # Scrape all active stocks for today
    py scripts/scraper.py --date 20240315    # Scrape for specific date
    py scripts/scraper.py --test BBCA        # Test scrape single stock

Note: Requires curl_cffi for browser impersonation to bypass IDX anti-scraping.
"""

import os
import sys
import json
import time
import argparse
import logging
import random
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from decimal import Decimal

import psycopg2
from dotenv import load_dotenv

# Use curl_cffi for browser impersonation
try:
    from curl_cffi import requests
    USING_CURL_CFFI = True
except ImportError:
    print("ERROR: curl_cffi is required. Install with: py -m pip install curl_cffi")
    sys.exit(1)

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configuration
IDX_BASE_URL = os.getenv('IDX_BASE_URL', 'https://www.idx.co.id')
DATABASE_URL = os.getenv('DATABASE_URL', '')
REQUEST_DELAY_MIN = 1.0
REQUEST_DELAY_MAX = 3.0
MAX_RETRIES = 3
TIMEOUT = 30

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


def parse_database_url(url: str) -> Dict[str, str]:
    """Parse PostgreSQL connection string with proper URL decoding."""
    from urllib.parse import urlparse, unquote

    # Parse the URL
    parsed = urlparse(url)

    # Extract components
    host = parsed.hostname or 'localhost'
    port = str(parsed.port or 5432)
    user = unquote(parsed.username) if parsed.username else 'postgres'
    password = unquote(parsed.password) if parsed.password else 'postgres'
    dbname = parsed.path.lstrip('/').split('?')[0] if parsed.path else 'biginflow'

    return {'host': host, 'port': port, 'user': user, 'password': password, 'dbname': dbname}


def get_db_connection():
    """Create database connection."""
    config = parse_database_url(DATABASE_URL)
    return psycopg2.connect(**config)


def get_watchlist(conn) -> List[Dict[str, Any]]:
    """Get active stocks from database."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, ticker, name FROM stocks WHERE is_active = true")
        return [{'id': r[0], 'ticker': r[1], 'name': r[2]} for r in cur.fetchall()]


def get_or_create_broker(conn, code: str, name: str) -> str:
    """Get broker ID or create if not exists."""
    import uuid
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM brokers WHERE code = %s", (code.upper(),))
        row = cur.fetchone()
        if row:
            return row[0]

        broker_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO brokers (id, code, name, category, created_at, updated_at)
            VALUES (%s, %s, %s, 'OTHER', NOW(), NOW())
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (broker_id, code.upper(), name))
        conn.commit()
        return cur.fetchone()[0]


def create_session():
    """Create session with Chrome browser impersonation."""
    logger.info("Creating session with Chrome impersonation")
    session = requests.Session(impersonate="chrome")

    # Initialize session with cookies
    try:
        logger.info("Initializing session...")
        resp = session.get(f"{IDX_BASE_URL}/id", timeout=TIMEOUT)
        logger.info(f"Session initialized (status: {resp.status_code})")
        time.sleep(1)

        # Visit broker summary page
        resp2 = session.get(
            f"{IDX_BASE_URL}/id/data-pasar/ringkasan-perdagangan/ringkasan-broker",
            timeout=TIMEOUT
        )
        logger.info(f"Broker page visited (status: {resp2.status_code})")
        time.sleep(1)
    except Exception as e:
        logger.warning(f"Session init warning: {e}")

    return session


def fetch_broker_summary(session, ticker: str, date_str: str) -> Optional[List[Dict[str, Any]]]:
    """Fetch aggregate broker summary from IDX with pagination."""
    url = f"{IDX_BASE_URL}/primary/TradingSummary/GetBrokerSummary"

    all_brokers = []
    start = 0
    length = 100  # Fetch in batches of 100

    while True:
        params = {
            'code': ticker.upper(),
            'date': date_str,
            'start': start,
            'length': length
        }

        for attempt in range(MAX_RETRIES):
            try:
                time.sleep(random.uniform(0.3, 0.8))

                response = session.get(url, params=params, timeout=TIMEOUT)

                if response.status_code == 200:
                    try:
                        data = response.json()
                        if data and data.get('data'):
                            brokers = data['data']
                            all_brokers.extend(brokers)

                            # Check if we got all records
                            total_records = data.get('recordsTotal', 0)
                            if len(all_brokers) >= total_records or len(brokers) == 0:
                                return all_brokers if all_brokers else None

                            # Move to next page
                            start += length
                            break
                        else:
                            return all_brokers if all_brokers else None
                    except json.JSONDecodeError:
                        pass

                elif response.status_code == 403:
                    logger.warning(f"403 Forbidden for {ticker}")
                    return all_brokers if all_brokers else None

            except Exception as e:
                logger.warning(f"Request error for {ticker}: {e}")

            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
        else:
            # All retries failed
            return all_brokers if all_brokers else None

    return all_brokers if all_brokers else None


def fetch_stock_price(session, ticker: str, date_str: str) -> Optional[Dict[str, Any]]:
    """Fetch stock price data from IDX."""
    # Try multiple endpoints for price data
    endpoints = [
        (f"{IDX_BASE_URL}/primary/StockData/GetTradeInfoDaily", {'code': ticker.upper(), 'date': date_str}),
        (f"{IDX_BASE_URL}/primary/TradingSummary/GetStockPrice", {'code': ticker.upper(), 'date': date_str}),
    ]

    for url, params in endpoints:
        try:
            time.sleep(random.uniform(0.5, 1.0))

            response = session.get(url, params=params, timeout=TIMEOUT)

            if response.status_code == 200:
                try:
                    data = response.json()
                    if data:
                        return data
                except json.JSONDecodeError:
                    pass

        except Exception as e:
            pass

    return None


def save_broker_data(conn, stock_id: str, date: datetime, broker_list: List[Dict[str, Any]]) -> int:
    """Save aggregate broker participation data."""
    import uuid
    records_saved = 0
    date_only = date.date()

    with conn.cursor() as cur:
        for broker in broker_list:
            try:
                # Extract broker info
                broker_code = (
                    broker.get('IDFirm') or
                    broker.get('BrokerCode') or
                    broker.get('Code') or ''
                ).strip()

                if not broker_code:
                    continue

                broker_name = (
                    broker.get('FirmName') or
                    broker.get('BrokerName') or
                    broker.get('Name') or
                    broker_code
                )

                broker_id = get_or_create_broker(conn, broker_code, broker_name)

                # Extract aggregate values
                volume = int(broker.get('Volume') or 0)
                value = float(broker.get('Value') or 0)
                frequency = int(broker.get('Frequency') or 0)

                # Skip if no data
                if volume == 0 and value == 0:
                    continue

                # Insert or update
                cur.execute("""
                    INSERT INTO broker_transactions
                        (id, stock_id, broker_id, date, volume, value, frequency, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (stock_id, broker_id, date) DO UPDATE SET
                        volume = EXCLUDED.volume,
                        value = EXCLUDED.value,
                        frequency = EXCLUDED.frequency
                """, (str(uuid.uuid4()), stock_id, broker_id, date_only, volume, value, frequency))
                records_saved += 1

            except Exception as e:
                logger.warning(f"Error parsing broker {broker.get('IDFirm', '?')}: {e}")

        conn.commit()

    return records_saved


def save_stock_price(conn, stock_id: str, date: datetime, price_data: Dict[str, Any]) -> bool:
    """Save stock price data."""
    import uuid
    date_only = date.date()

    try:
        # Extract price info (different response formats)
        open_price = float(price_data.get('Open') or price_data.get('open') or 0)
        high_price = float(price_data.get('High') or price_data.get('high') or 0)
        low_price = float(price_data.get('Low') or price_data.get('low') or 0)
        close_price = float(price_data.get('Close') or price_data.get('close') or price_data.get('Last') or 0)
        volume = int(price_data.get('Volume') or price_data.get('volume') or 0)
        change = float(price_data.get('Change') or price_data.get('change') or 0)
        change_pct = float(price_data.get('ChangePct') or price_data.get('change_pct') or 0)

        # If we don't have close price, skip
        if close_price == 0:
            return False

        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO stock_prices
                    (id, stock_id, date, open, high, low, close, volume, change, change_pct, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (stock_id, date) DO UPDATE SET
                    open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
                    close = EXCLUDED.close, volume = EXCLUDED.volume,
                    change = EXCLUDED.change, change_pct = EXCLUDED.change_pct
            """, (str(uuid.uuid4()), stock_id, date_only,
                  open_price, high_price, low_price, close_price,
                  volume, change, change_pct))
            conn.commit()

        return True

    except Exception as e:
        logger.warning(f"Error saving price data: {e}")
        return False


def create_scrape_log(conn, date: datetime, status: str) -> str:
    """Create scrape log entry."""
    import uuid
    log_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO scrape_logs (id, date, status, started_at, created_at) VALUES (%s, %s, %s, NOW(), NOW())",
            (log_id, date.date(), status)
        )
        conn.commit()
    return log_id


def update_scrape_log(conn, log_id: str, status: str, processed: int, failed: int, error: Optional[str] = None):
    """Update scrape log entry."""
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE scrape_logs SET status=%s, stocks_processed=%s, stocks_failed=%s,
               error_message=%s, completed_at=NOW() WHERE id=%s""",
            (status, processed, failed, error, log_id)
        )
        conn.commit()


def run_scraper(date: Optional[datetime] = None, test_ticker: Optional[str] = None):
    """Run the scraper."""
    if date is None:
        date = datetime.now()
        # If before 16:30, use previous day
        if date.hour < 16 or (date.hour == 16 and date.minute < 30):
            date = date - timedelta(days=1)
        # Skip weekends
        while date.weekday() >= 5:
            date = date - timedelta(days=1)

    date_str = date.strftime('%Y%m%d')
    logger.info(f"Starting scraper for date: {date_str}")

    session = create_session()

    # Test mode
    if test_ticker:
        logger.info(f"Test mode: {test_ticker}")

        broker_data = fetch_broker_summary(session, test_ticker, date_str)
        if broker_data:
            logger.info(f"[OK] Got broker data for {test_ticker} ({len(broker_data)} brokers)")
            print(json.dumps(broker_data[:3], indent=2))
        else:
            logger.error(f"[FAIL] No broker data for {test_ticker}")

        price_data = fetch_stock_price(session, test_ticker, date_str)
        if price_data:
            logger.info(f"[OK] Got price data for {test_ticker}")
            print(json.dumps(price_data, indent=2))
        else:
            logger.warning(f"[FAIL] No price data for {test_ticker}")

        return

    # Full scrape mode
    try:
        conn = get_db_connection()
        logger.info("Database connected")
    except Exception as e:
        logger.error(f"Database error: {e}")
        sys.exit(1)

    log_id = create_scrape_log(conn, date, 'RUNNING')
    watchlist = get_watchlist(conn)

    if not watchlist:
        logger.warning("Watchlist empty")
        update_scrape_log(conn, log_id, 'FAILED', 0, 0, "Empty watchlist")
        conn.close()
        return

    logger.info(f"Processing {len(watchlist)} stocks...")
    processed, failed = 0, 0

    for i, stock in enumerate(watchlist):
        ticker = stock['ticker']
        logger.info(f"[{i+1}/{len(watchlist)}] {ticker}...")

        try:
            # Fetch broker data
            broker_data = fetch_broker_summary(session, ticker, date_str)
            broker_saved = 0
            if broker_data:
                broker_saved = save_broker_data(conn, stock['id'], date, broker_data)
                logger.info(f"  [OK] Saved {broker_saved} broker records")

            # Fetch price data
            price_data = fetch_stock_price(session, ticker, date_str)
            price_saved = False
            if price_data:
                price_saved = save_stock_price(conn, stock['id'], date, price_data)
                if price_saved:
                    logger.info(f"  [OK] Saved price data")

            if broker_saved > 0 or price_saved:
                processed += 1
            else:
                logger.warning(f"  [FAIL] No data")
                failed += 1

        except Exception as e:
            logger.error(f"  [ERROR] {e}")
            failed += 1

        # Delay between requests
        if i < len(watchlist) - 1:
            time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))

    status = 'SUCCESS' if processed > 0 else 'FAILED'
    update_scrape_log(conn, log_id, status, processed, failed)
    logger.info(f"Completed. Processed: {processed}, Failed: {failed}")
    conn.close()
    sys.exit(0 if processed > 0 else 1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='IDX Broker & Price Scraper')
    parser.add_argument('--date', type=str, help='Date in YYYYMMDD format')
    parser.add_argument('--test', type=str, help='Test single ticker')
    args = parser.parse_args()

    target_date = None
    if args.date:
        try:
            target_date = datetime.strptime(args.date, '%Y%m%d')
        except ValueError:
            logger.error(f"Invalid date: {args.date}")
            sys.exit(1)

    run_scraper(date=target_date, test_ticker=args.test)


if __name__ == '__main__':
    main()
