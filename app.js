const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const databasePath = path.join(__dirname, 'covid19India.db')

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertObjects = statesArray => {
  return {
    stateId: statesArray.state_id,
    stateName: statesArray.state_name,
    population: statesArray.population,
  }
}

app.get('/states/', async (request, response) => {
  const getStateQuery = `
    SELECT *
    FROM state;`
  const statesArray = await database.all(getStateQuery)
  response.send(statesArray.map(eachArray => convertObjects(eachArray)))
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT *
    FROM state
    WHERE state_id = ${stateId};`
  const stateObject = await database.get(getStateQuery)
  response.send(convertObjects(stateObject))
})

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const addNewDetails = `
    INSERT INTO
      district (district_Name, state_id, cases, cured, active, deaths)
    VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`
  await database.run(addNewDetails)
  response.send('District Successfully Added')
})

const ConvertCamalCase = districtObject => {
  return {
    districtId: districtObject.district_id,
    districtName: districtObject.district_name,
    stateId: districtObject.state_id,
    cases: districtObject.cases,
    cured: districtObject.cured,
    active: districtObject.active,
    deaths: districtObject.deaths,
  }
}

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistricDetails = `
    SELECT *
    FROM district
    WHERE district_id = ${districtId};`
  const getDistricObject = await database.get(getDistricDetails)
  response.send(ConvertCamalCase(getDistricObject))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistricQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId};`
  await database.run(deleteDistricQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrictQuery = `
    UPDATE district
    SET district_name = '${districtName}',
        state_id = '${stateId}',
        cases = '${cases}',
        cured = '${cured}',
        active = '${active}',
        deaths = '${deaths}'
    WHERE district_id = '${districtId}';`
  await database.run(updateDistrictQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStateStatusQuery = `
    SELECT 
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM 
      district
    WHERE
      state_id = ${stateId};`
  const status = await database.get(getStateStatusQuery)
  response.send({
    totalCases: status['SUM(cases)'],
    totalCured: status['SUM(cured)'],
    totalActive: status['SUM(active)'],
    totalDeaths: status['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `
    SELECT state_id 
    FROM district
    WHERE district_id = ${districtId};`
  const getDistrictIdQueryResponse = await database.get(getDistrictIdQuery)

  const getStateNameQuery = `
    SELECT state_name as stateName 
    FROM state
    WHERE state_id = ${getDistrictIdQueryResponse.state_id};`
  const getStateNameQueryResponse = await database.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
})

module.exports = app
