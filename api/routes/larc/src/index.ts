import { createOKResult, RawHandler } from 'api-core'
import { createLambdaHandler } from 'api-core'
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import * as cheerio from 'cheerio'
import { fetch } from 'cross-fetch'

export async function getLarcSections() {
  const html = await fetch('https://enroll.larc.uci.edu/').then((res) => res.text())

  const $ = cheerio.load(html)

  const larcSections = $('.tutorial-group')
    .toArray()
    .map((card) => {
      const match = $(card)
        .find('.card-header')
        .text()
        .trim()
        .match(/(?<courseCode>[^()]*)( \(same as (?<sameAs>.*)\))? - (.*) \((?<courseName>.*)\)/)

      const body = $(card)
        .find('.list-group')
        .toArray()
        .map((group) => {
          const rows = $(group).find('.col-lg-4')

          const [day, time] = $(rows[0])
            .find('.col')
            .map((_, col) => $(col).text().trim())

          const [instructor, building] = $(rows[1])
            .find('.col')
            .map((_, col) => $(col).text().trim())

          return { day, time, instructor, building }
        })

      const larcSection = { header: { ...match?.groups }, body }

      // console.log("header: ", larcSection.header, "\n", "body: ", larcSection.body);

      return larcSection
    })

  return larcSections
}

export const rawHandler: RawHandler = async (request) => {
  const larcSections = await getLarcSections()
  return createOKResult(larcSections, request.getParams().requestId)
}

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => createLambdaHandler(rawHandler)(event, context)

// async function start() {
//   const larcSections = await getLarcSections();
//   console.log('larc', larcSections);
// }
// start()
