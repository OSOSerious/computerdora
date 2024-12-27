import { createInterface } from 'readline/promises';
import { fileURLToPath } from 'url';
import { aiService } from './ai.js';
import { screenObserver } from './screen-observer.js';

class CursorCLI {
  private rl = createInterface({ 
    input: process.stdin, 
    output: process.stdout 
  });

  async start() {
    console.log('Cursor Tool Interface');
    console.log('Available commands:');
    console.log('- analyze: Analyze current cursor position and screen context');
    console.log('- market: Generate market research based on screen content');
    console.log('- export: Export screen observations to CSV');
    console.log('- clear: Clear observation history');
    console.log('- status: Show current cursor position and window');
    console.log('- exit: Exit the program');
    console.log('----------------------------------------');
    console.log('Keyboard shortcuts (when window is focused):');
    console.log('Alt + C: Quick context analysis');
    console.log('Alt + E: Quick export to CSV');
    console.log('----------------------------------------');

    while (true) {
      try {
        const command = await this.rl.question('cursor> ');
        
        switch (command.toLowerCase()) {
          case 'analyze':
            const contextInfo = await aiService.extractContextualInfo();
            console.log('\nContext Analysis:');
            console.log(contextInfo);
            break;

          case 'market':
            const screenState = await aiService.getScreenState();
            const marketInsights = await aiService.generateMarketResearch(screenState.screenContent);
            console.log('\nMarket Research Insights:');
            console.log(marketInsights);
            break;

          case 'export':
            const csv = screenObserver.exportObservationsToCsv();
            const filename = `screen_observations_${new Date().toISOString()}.csv`;
            console.log(`\nExported observations to ${filename}`);
            break;

          case 'status':
            const state = screenObserver.getState();
            console.log('\nCurrent Status:');
            console.log(`Cursor Position: (${state.cursorPosition.x}, ${state.cursorPosition.y})`);
            console.log(`Active Window: ${state.activeWindow}`);
            console.log(`Last Updated: ${new Date(state.timestamp).toLocaleString()}`);
            break;

          case 'clear':
            screenObserver.clearObservationHistory();
            aiService.clearHistory();
            console.log('Observation and conversation history cleared.');
            break;

          case 'exit':
            console.log('Goodbye!');
            this.rl.close();
            return;

          default:
            console.log('Unknown command. Available commands: analyze, market, export, status, clear, exit');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }
}

// Start the CLI if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cli = new CursorCLI();
  cli.start();
}

export const cursorCLI = new CursorCLI();
