const LottoStat = require('./LottoStat')
const FS = require('fs')

function getHistory() {    
  if (FS.existsSync('history.json')) {
    return FS.readFileSync('history.json').toJSON()    
  }
  console.log('History file does not exist')
  return []
}

async function main() {
  try {
    const latestResult = await LottoStat.getGameResult()    
    const lastGameNumber = latestResult.gameNumber    
    const history = getHistory()
    // update    
    if (history.length < lastGameNumber) {
      console.log(`History not up to date. ${history.length} -> ${lastGameNumber}`)
      while (history.length < lastGameNumber) {
        const updateGameNumber = history.length + 1
        const updateResult = await LottoStat.getGameResult(updateGameNumber)
        history.push(updateResult)
        console.log(`Updating... ${updateGameNumber}`)
        console.log(updateResult)
      }
      FS.writeFileSync('history.json', JSON.stringify(history))
    }

  } catch (err) {
    console.error(err)
  }
}

main()