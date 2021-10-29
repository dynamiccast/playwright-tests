const axios = require("axios");
const fs = require("fs");
const lodash = require("lodash");

const fsPromises = fs.promises;

const folder = "./qawolf/"
const graphQLendpoint = "http://54b9-24-160-138-160.ngrok.io/api/graphql";
const teamId = process.env.QAWOLF_TEAM_ID;
const authToken = process.env.QAWOLF_AUTH_TOKEN;

function request(query) {
  return axios(graphQLendpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-qawolf-team-id': teamId,
      'authorization': authToken,
    },
    data: {
      query
    },
  });
}

async function overwriteFile(path, content) {
  try {
    await fsPromises.truncate(outputFileName, 0);
  } catch (e) {
    // Probably because file does not exist yet
  }

  return fsPromises.writeFile(path, content);
}

async function getContent(fileName) {
  const response = await request(`
    query file {
      file(id: "${fileName}") {
        content
        id
        is_deleted
        is_read_only
        path
        team_id
        __typename
        }
      }`);

  return response.data.data.file.content;
}

async function writeTestCode(teamId) {
  const response = await request(`
    query tests {
      tests(team_id: "${teamId}") {
        id
        name
        __typename
        }
      }`);

  const helperContent = await getContent(`helpers.${teamId}`);
  await overwriteFile(folder + "helpers.js", helperContent);

  response.data.data.tests.map(async (test) => {
    const content = await getContent(`test.${test.id}`);
    const outputFileName = `${lodash.snakeCase(test.name)}.js`;

    await overwriteFile(folder + outputFileName, content);
  });
}

try {
  writeTestCode(teamId);
} catch (e) {
  console.error(e);
}
