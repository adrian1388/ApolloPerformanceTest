import RNFetchBlob from 'rn-fetch-blob'

const DocumentDir = RNFetchBlob.fs.dirs.DocumentDir
const storagePath = `${DocumentDir}/persistStore`
const encoding = 'utf8'

const toFileName = (name: string) => name.split(':').join('-')
const fromFileName = (name: string) => name.split('-').join(':')

const pathForKey = (key: string) => `${storagePath}/${toFileName(key)}`

/*
 * React storage for android that uses file system instead of app storage,
 *
 * Follow rn-fetch-blob installation instructions in order to use this storage (https://github.com/joltup/rn-fetch-blob).
 */
const AndroidFileStorage = {
  setItem: (
    key: string,
    value: string,
    callback?: ?(error: ?Error) => void,
  ) =>
    new Promise((resolve, reject) =>
      RNFetchBlob.fs.writeFile(pathForKey(key), value, encoding)
        .then(() => {
          if (callback) {
            callback()
          }
          resolve()
        })
        .catch(error => {
          if (callback) {
            callback(error && error)
          }
          reject(error)
        })
  ),
  getItem: (
    key: string,
    callback?: ?(error: ?Error, result: ?string) => void
  ) =>
    new Promise((resolve, reject) =>
      RNFetchBlob.fs.readFile(pathForKey(toFileName(key)), encoding)
        .then(data => {
          if (callback) {
            callback(null, data)
          }
          resolve(data)
        })
        .catch(error => {
          if (callback) {
            callback(error)
          }
          // We call resolve and not reject because we don't want the user to handle the file not found exception.
          // Instead of that we resolve as null because the key was not found.
          resolve(null)
        })
  ),
  removeItem: (
    key: string,
    callback?: ?(error: ?Error) => void,
  ) =>
    new Promise((resolve, reject) =>
      RNFetchBlob.fs.unlink(pathForKey(toFileName(key)))
        .then(() => {
          if (callback) {
            callback()
          }
          resolve()
        })
        .catch(error => {
          if (callback) {
            callback(error)
          }
          reject(error)
        })
  ),
  getAllKeys: (
    callback?: ?(error: ?Error, keys: ?Array<string>) => void,
  ) =>
    new Promise((resolve, reject) =>
      RNFetchBlob.fs.exists(storagePath)
      .then(exists =>
        exists ? Promise.resolve() : RNFetchBlob.fs.mkdir(storagePath)
      )
      .then(() =>
        RNFetchBlob.fs.ls(storagePath)
          .then(files => files.map(file => fromFileName(file)))
          .then(files => {
            if (callback) {
              callback(null, files)
            }
            resolve(files)
          })
      )
      .catch(error => {
        if (callback) {
          callback(error)
        }
        reject(error)
      })
  ),
}

export default AndroidFileStorage;
