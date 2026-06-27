import { parseTvSeriesCollection } from './parseTV';
import { writeTvSeriesCollection, closeDriver } from './writeToDB';
import { readFile } from 'node:fs/promises';

async function main() {
  var raw;
  const readline = require('readline');
  const  msg:string = 'Listening for input... Press any key to continue,  "x" to exit.\n';
  
  // Put stdin into raw mode so we get eystrokes immediately
  // without the user having to press Enter
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');


  try {
    
    console.log(msg);
    process.stdin.on('data', async (key) => {
        // Ctrl+C — honour the conventional exit signal
      if (key === '\u0003') {
        console.log('\nInterrupted (Ctrl+C).');
        await closeDriver();
        process.exit();
      }
      if (key === 'x') {
        console.log('Exiting...');
        await closeDriver();
        process.exit(0);
      }
      try {
        raw = await readFile('./temp/data.json', 'utf-8');
        const collection = parseTvSeriesCollection(raw);
        await writeTvSeriesCollection(collection);
        console.log(collection.tv_series[0].name+' has '+
            collection.tv_series[0].season_count+' seasons'+ 
            ' and '+collection.tv_series[0].seasons[0].episode_count+' episodes in season 1');
      } catch (e) {
        console.error('Invalid data:', (e as Error).message);
      }
      console.log('\n\n'+msg);
    });

  } catch (e) {
    console.error('Error initializing:', (e as Error).message);
    await closeDriver();
    process.exit(1);
  }
}

main();