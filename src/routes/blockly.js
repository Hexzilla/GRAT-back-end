const router = require('express').Router();
const { exec } = require('child_process');
const { body, validationResult } = require('express-validator');
const fs = require('fs'); 
const path = require('path');

router.get('/', (req, res) => {
  res.json({ success: true })
});

const getUserDir = (taqId) => {
  const rootDir = path.dirname(require.main.filename);
  return `${rootDir}/../storage/${taqId}`;
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
      await fs.promises.mkdir(fileDir, { recursive: true });

      const filePath = `${fileDir}/${name}.py`;
      console.log('filePath', filePath);

      await fs.promises.writeFile(filePath, code);

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
        if (!await initTaq()) {
          return res.status(400).json({ message: 'Failed to initialize taq'});
        }
      }

      const command = `taq compile --configDir ./storage/${taqId}/.taq ${name}.py`
      console.log('command', command)
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`error: ${error.message}`);
          return;
        }

        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }

        console.log(`stdout:\n${stdout}`);
        return res.json({ success: true })
      });

    } catch (ex) {
      console.error(ex);
      return res.status(400).json({ message: 'system error' });
    }
});

const initTaq = async (dir) => {
  try {
    const taqDir = `${dir}/.taq`;
    await fs.promises.mkdir(taqDir, { recursive: true });
    await fs.promises.mkdir(`${dir}/contracts`, { recursive: true });
    await fs.promises.mkdir(`${dir}/tests`, {recursive: true });
    await fs.promises.mkdir(`${dir}/artifacts`, {recursive: true });

    await fs.promises.copyFile('../../.taq/state.json', `${dir}/.taq/state.json`);

    const taqconf = {...configData};
    taqconf.contractsDir = `${dir}/contracts`;
    taqconf.testsDir = `${dir}/tests`;
    taqconf.artifactsDir = `${dir}/artifacts`;
    await fs.promises.writeFile(`${dir}/.taq/config.json`, JSON.stringify(taqconf));
    
    return true;
  } catch (ex) {
    console.error(ex);
    return false;
  }
}

module.exports = router;
