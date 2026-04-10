/**
 * Test scoring - simple fetch to API
 */

async function runScoring() {
  console.log('\nTesting scoring API...\n');

  try {
    const response = await fetch('http://localhost:3000/api/scoring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: '2024-03-15',
        sendNotification: false,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✓ Scoring completed successfully!\n');
      console.log(`Total stocks processed: ${data.data.totalProcessed}`);
      console.log(`Signals found: ${data.data.signalCount}\n`);

      if (data.data.signals && data.data.signals.length > 0) {
        console.log('Top signals:');
        data.data.signals.slice(0, 10).forEach((s, i) => {
          console.log(`${i + 1}. ${s.ticker} - Score: ${s.score}`);
        });
      } else {
        console.log('No signals detected.');
        console.log('\nPossible reasons:');
        console.log('- Signal criteria not met (need: price up, foreign >= 10%, fund >= 5%)');
        console.log('- Not enough broker data');
        console.log('- Price data missing');
      }
    } else {
      console.log('✗ Error:', data.error);
    }
  } catch (error) {
    console.error('Error calling API:', error.message);
    console.log('\nMake sure dev server is running: npm run dev');
  }
}

runScoring();
