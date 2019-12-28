import FS from 'fs'
import LottoStat, { IGameResult } from './LottoStat'
import { AsyncQueue } from './AsyncQueue'

function getHistory() {
  if (FS.existsSync('history.json')) {
    return JSON.parse(FS.readFileSync('history.json', { encoding: 'utf8' }))
  }
  console.log('History file does not exist')
  return []
}

/*
function getAppearanceRank(appearances) {
  return appearances.map((count, number) => {
    return { [number]: count }
  }).sort((a, b) => {
    if (a.count != b.conut) {
      return a.count - b.count
    } else {
      return b.lastGame - a.lastGame
    }
  })
}
*/

const gameResultFetcher = async (queue: AsyncQueue, args: any) => {
  return LottoStat.getGameResult(args)
}

function fetchGames(start: number, last: number): Promise<Array<IGameResult>> {
  return new Promise((resolve, reject) => {
    const updates = Array<IGameResult>()
    const asyncQueue = new AsyncQueue('fetcher', 20, AsyncQueue.Mode.FIFO)
    asyncQueue.on('data', (data) => {
      updates.push(data)
    }).on('close', () => {
      resolve(updates)
      asyncQueue.close()
    }).on('error', (err: Error) => {      
      reject(err)
    }).start()
    let gameNumber = start
    while (gameNumber < last) {  
      console.log(`Fetching... ${gameNumber}`)
      asyncQueue.enqueue({
        handler: gameResultFetcher,
        args: gameNumber
      })    
      gameNumber++
    }
  })
}



async function main() {
  try {
    const latestResult = await LottoStat.getGameResult()
    const lastGameNumber = latestResult.gameNumber
    console.log('Latest game number: %d', lastGameNumber)
    const history: Array<IGameResult> = getHistory()
    // update
    if (history.length < lastGameNumber) {
      console.log(`History not up to date. ${history.length} -> ${lastGameNumber}`)
      const updates = await fetchGames(history.length, lastGameNumber)      
      history.concat(updates)
    } else {
      console.log(`History up to date. ${lastGameNumber}`)
    }
    FS.writeFileSync('history.json', JSON.stringify(history))
    /*
    const appearances = Array(45).fill(0)
    history.forEach((game) => {
      const appearanceRank = getAppearanceRank(appearances)
      game.gameResult.forEach((pick) => {
        appearance[pick]++
      })

    })
    */
  } catch (err) {
    console.error(err)
  }
}

main()