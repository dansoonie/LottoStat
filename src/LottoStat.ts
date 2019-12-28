import Axios from 'axios'
import JSDOM from 'jsdom'

const BASE_URL = 'https://dhlottery.co.kr/gameResult.do'

export interface IGameResult {
  gameNumber: number,
  gameDate: string
  gameResult: number[]
}

function parse(body: string): IGameResult {
  function parseGameNumber(document: HTMLDocument) {
    const element = document.querySelector('div.win_result h4 strong')
    if (element && element.textContent) {
      const match = /(\d+)/.exec(element.textContent)
      if (match) {
        return parseInt(match[1])
      }
    }
    return null
  }
  
  function parseGameDate(document: HTMLDocument) {
    const element = document.querySelector('div.win_result p')
    if (element && element.textContent) {    
      const match = /(\d{4}).+(\d{2}).+(\d{2})/.exec(element.textContent)
      if (match) {
        return `${match[1]}/${match[2]}/${match[3]}`
      }
    }
    return null
  }

  function parseGameResult(document: HTMLDocument) {
    const elements = document.querySelectorAll('div.win_result div.nums div.num.win p span.ball_645')    
    if (elements) {
      const result = new Array<number>()
      elements.forEach(element => {
        if (element.textContent) {
          result.push(parseInt(element.textContent))
        }
      })
      return result.sort((a, b) => { return a - b })
    }
    return null
  }

  const domTree = new JSDOM.JSDOM(body)
  const document = domTree.window.document

  const gameNumber = parseGameNumber(document)
  const gameDate = parseGameDate(document)
  const gameResult = parseGameResult(document)
  
  return {
    gameNumber: gameNumber!,
    gameDate: gameDate!,
    gameResult: gameResult!
  }
}

export default class LottoStat {
  static getGameResult(gameNumber?: number): Promise<IGameResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const params: any = { method: 'byWin' }
        if (gameNumber !== undefined) {
          params.drwNo = gameNumber
        }
        const response = await Axios.get(BASE_URL, {
          params: params          
        })
        resolve(parse(response.data))
      } catch (err) {
        reject(err)
      }
    })
  }
}