module.exports = function ({ executor, statement }) {
  const Statement = {
    /**
     * @return {string|undefined}
     */
    get sql () {
      return statement.sql
    },

    /**
     * @return {number|undefined}
     */
    get lastID () {
      return statement.lastID
    },

    /**
     * @return {number|undefined}
     */
    get changes () {
      return statement.changes
    }
  }

  /**
   * @param {...*|Object|Array} [params=[]]
   * @return {Promise<Array>}
   * @async
   */
  Statement.all = (...params) =>
    executor
      .exec({ statement, method: 'all', params })
      .then(({ result }) => result)

  /**
   * @param {...*|Object|Array} [params=[]]
   * @return {Promise<Object|undefined>}
   * @async
   */
  Statement.get = (...params) =>
    executor
      .exec({ statement, method: 'get', params })
      .then(({ result }) => result)

  /**
   * @param {...*|Object|Array} [params=[]]
   * @return {Promise<Statement>}
   * @async
   */
  Statement.run = (...params) =>
    executor.exec({ statement, method: 'run', params }).then(() => Statement)

  /**
   * @return {Promise<Statement>}
   * @async
   */
  Statement.bind = (...params) =>
    executor.exec({ statement, method: 'bind', params }).then(() => Statement)

  /**
   * @return {Promise<Statement>}
   * @async
   */
  Statement.reset = () => {
    return new Promise((resolve, reject) => {
      statement.reset(error => {
        if (error) {
          reject(error)
        } else {
          resolve(Statement)
        }
      })
    })
  }

  /**
   * @return {Promise<Statement>}
   * @async
   */
  Statement.finalize = () => {
    return new Promise((resolve, reject) => {
      statement.finalize(error => {
        if (error) {
          reject(error)
        } else {
          resolve(Statement)
        }
      })
    })
  }

  return Statement
}
