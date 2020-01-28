const Statement = require('./statement')

module.exports = function ({ executor }) {
  const Database = {}

  /**
   * @param {string} sql
   * @param {...*|Object|Array} [params]
   * @return {Promise<Array>}
   * @async
   */
  Database.all = (sql, ...params) =>
    executor.exec({ method: 'all', sql, params }).then(({ result }) => result)

  /**
   * @param {string} sql
   * @return {Promise<{sql: string}>}
   * @async
   */
  Database.exec = sql =>
    executor.exec({ method: 'exec', sql }).then(() => Database)

  /**
   * @param {string} sql
   * @param {...*|Object|Array} [params]
   * @return {Promise<Object|undefined>}
   * @async
   */
  Database.get = (sql, ...params) =>
    executor.exec({ method: 'get', sql, params }).then(({ result }) => result)

  /**
   * @param {string} sql
   * @param {...*|Object|Array} [params]
   * @return {Promise<{lastID: number, changes: number, sql: string}>}
   * @async
   */
  Database.run = (sql, ...params) =>
    executor.exec({ method: 'run', sql, params }).then(({ instance }) => ({
      lastID: instance.lastID,
      changes: instance.changes,
      sql: instance.sql
    }))

  /**
   * @param {string} sql
   * @param {...*|Object|Array} [params]
   * @return {Statement}
   * @async
   */
  Database.prepare = (sql, ...params) =>
    executor
      .prepare({ sql, params })
      .then(statement => new Statement({ executor, statement }))

  /**
   * @return {Promise<Database>}
   * @async
   */
  Database.close = () => executor.close().then(() => Database)

  return Database
}
