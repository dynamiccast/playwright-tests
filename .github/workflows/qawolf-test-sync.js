import axios from "axios";
import fs from "fs";
import lodash from "lodash";

const fsPromises = fs.promises;

const folder = "./qawolf/"
const graphQLendpoint = "http://54b9-24-160-138-160.ngrok.io/api/graphql";
const helpersTemplatePath = "./.github/workflows/helpersTemplate.js";
let helpersTemplateContent = null;
const testTemplatePath = "./.github/workflows/testTemplate.js";
let testTemplateContent = null;
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

function wrapHelpersTemplate(content) {
  if (!helpersTemplateContent) {
    helpersTemplateContent = fs.readFileSync(helpersTemplatePath).toString();
  }

  return helpersTemplateContent.replace("/* Insert helpers here */", content);
}

function wrapTestTemplate(content) {
  if (!testTemplateContent) {
    testTemplateContent = fs.readFileSync(testTemplatePath).toString();
  }

  return testTemplateContent.replace("/* Insert test here */", content);
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
  let promises = [];

  const helperContent = await getContent(`helpers.${teamId}`);
  promises.push(overwriteFile(folder + "helpers.js", wrapHelpersTemplate(helperContent)));

  response.data.data.tests.map(async (test) => {
    const content = await getContent(`test.${test.id}`);
    const outputFileName = `${lodash.snakeCase(test.name)}.js`;

    console.log(`Copy "${test.name}"`);
    promises.push(overwriteFile(folder + outputFileName, wrapTestTemplate(content)));
  });
  
  await Promise.all(promises);
}

try {
  writeTestCode(teamId);
} catch (e) {
  console.error(e);
}
