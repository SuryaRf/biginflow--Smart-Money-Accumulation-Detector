#!/usr/bin/env python3
"""
Quick sample scraper for testing - scrapes only a few stocks
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from scraper import create_session, fetch_broker_summary, save_broker_data, get_db_connection
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sample stocks to scrape
SAMPLE_STOCKS = [
    ("BBCA", "Bank Central Asia Tbk"),
    ("ADRO", "Adaro Energy Indonesia Tbk"),
    ("PTBA", "Bukit Asam Tbk"),
    ("UNVR", "Unilever Indonesia Tbk"),
    ("BBRI", "Bank Rakyat Indonesia Tbk"),
]

def main():
    date = datetime(2024, 3, 15)
    date_str = date.strftime('%Y%m%d')

    logger.info(f"Sample scrape for date: {date_str}")
    logger.info(f"Scraping {len(SAMPLE_STOCKS)} stocks...")

    session = create_session()
    conn = get_db_connection()

    # Get stock IDs from database
    with conn.cursor() as cur:
        cur.execute("SELECT id, ticker FROM stocks WHERE ticker = ANY(%s)",
                   ([s[0] for s in SAMPLE_STOCKS],))
        stock_map = {row[1]: row[0] for row in cur.fetchall()}

    success = 0
    for ticker, name in SAMPLE_STOCKS:
        if ticker not in stock_map:
            logger.warning(f"  {ticker} not found in database, skipping")
            continue

        logger.info(f"  Scraping {ticker}...")

        broker_data = fetch_broker_summary(session, ticker, date_str)
        if broker_data:
            saved = save_broker_data(conn, stock_map[ticker], date, broker_data)
            logger.info(f"    ✓ Saved {saved} broker records")
            success += 1
        else:
            logger.warning(f"    ✗ No data")

    conn.close()
    logger.info(f"\nCompleted! {success}/{len(SAMPLE_STOCKS)} stocks scraped successfully")

if __name__ == '__main__':
    main()
