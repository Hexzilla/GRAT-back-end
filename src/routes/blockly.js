const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

router.get('/', (req, res) => {
  res.json({ success: true })
});

const getUserDir = (taqId) => {
  const rootDir = path.dirname(require.main.filename);
  return `${rootDir}/../storage/${taqId}`;
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
      await fs.mkdir(fileDir, { recursive: true });

      const filePath = `${fileDir}/${name}.py`;
      console.log('filePath', filePath);

      await fs.writeFile(filePath, code);

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

      if (!await fs.exists(filePath)) {
        return res.status(400).json({ message: 'File does not exists'});
      }

      const configPath = `${userDir}/.taq/config.json`;
      if (!await fs.exists(configPath)) {
        await initTaq();
      }



    } catch (ex) {
      console.error(ex);
      return res.status(400).json({ message: 'system error' });
    }
});

const initTaq = async (dir) => {

}


module.exports = router;
