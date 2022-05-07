const path = require('path');
const router = require('express').Router();
const { exec } = require('child_process');
const { body, validationResult } = require('express-validator');
const fs = require('fs'); 
const configData = require('../../.taq/config.json');

router.get('/', (req, res) => {
  res.json({ success: true })
});

const getRootDir = () => {
  const rootDir = path.dirname(require.main.filename);
  return path.dirname(rootDir);
}

const getUserDir = (taqId) => {
  return `${getRootDir()}/storage/${taqId}`;
}

const isExists = async (filePath) => {
  return fs.promises.access(filePath, fs.constants.R_OK)
    .then(() => true)
    .catch(() => false)
}

router.post(
  '/', 
  body('name').isString(),
  body('code').isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const taqId = '4d443421-46da-492f-b8f6-31fc8d7b09bb';//req.cookies.taqId;
      console.log('taqId', taqId);
      if (!taqId) {
        return res.status(400).json({ message: 'Invalid taqId'});
      }

      const {name, code} = req.body;
      console.log('name-code', name, code);

      const userDir = getUserDir(taqId);
      const fileDir = `${userDir}/contracts`;
      const result = await fs.promises.mkdir(fileDir, { recursive: true });
      console.log('mkdir-result', result);

      const filePath = `${fileDir}/${name}.py`;
      console.log('filePath', filePath);

      const buff = Buffer.from(code, 'base64');
      const codestr = buff.toString('utf-8');

      await fs.promises.writeFile(filePath, codestr);

      res.json({ success: true })
    } catch (ex) {
      console.error(ex);
      return res.status(400).json({ message: 'system error' });
    }
})

router.post(
  '/compile', 
  body('name').isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const taqId = '4d443421-46da-492f-b8f6-31fc8d7b09bb';//req.cookies.taqId;
      console.log('taqId', taqId);
      if (!taqId) {
        return res.json({ success: false, message: 'Invalid taqId'});
      }

      const {name} = req.body;
      const userDir = getUserDir(taqId);
      const filePath = `${userDir}/contracts/${name}.py`;
      console.log('filePath', filePath);

      if (!await isExists(filePath)) {
        return res.status(400).json({ message: 'File does not exists'});
      }

      const configPath = `${userDir}/.taq/config.json`;
      if (!await isExists(configPath)) {
        if (!await initTaq(taqId)) {
          return res.status(400).json({ message: 'Failed to initialize taq'});
        }
      }

      const command = `taq compile --configDir ./storage/${taqId}/.taq ${name}.py`
      console.log('command', command)
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`error: ${error.message}`);
          return res.json({ success: false, message: error.message })
          return;
        }

        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return res.json({ success: false, message: stderr })
        }

        console.log(`stdout:\n${stdout}`);
        return res.json({ success: true, data: stdout })
      });

    } catch (ex) {
      console.error(ex);
      return res.status(400).json({ message: 'system error' });
    }
});

const initTaq = async (taqId) => {
  try {
    console.log('initTaq', taqId);
    const userDir = getUserDir(taqId);
    await fs.promises.mkdir(`${userDir}/.taq`, { recursive: true });
    await fs.promises.mkdir(`${userDir}/contracts`, { recursive: true });
    await fs.promises.mkdir(`${userDir}/tests`, {recursive: true });
    await fs.promises.mkdir(`${userDir}/artifacts`, {recursive: true });

    const rootDir = getRootDir();
    await fs.promises.copyFile(`${rootDir}/.taq/state.json`, `${userDir}/.taq/state.json`, fs.constants.COPYFILE_FICLONE);

    const taqconf = {...configData};
    taqconf.contractsDir = `./storage/${taqId}/contracts`;
    taqconf.testsDir = `./storage/${taqId}/tests`;
    taqconf.artifactsDir = `./storage/${taqId}/artifacts`;
    await fs.promises.writeFile(`${userDir}/.taq/config.json`, JSON.stringify(taqconf, null, 2));
    
    return true;
  } catch (ex) {
    console.error(ex);
    return false;
  }
}

module.exports = router;
