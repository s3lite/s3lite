# [![S3Lite → SQLite + S3](https://avatars0.githubusercontent.com/u/60323596?s=36&v=4)](https://github.com/s3lite/s3lite) S3Lite → SQLite + S3


[![Build Status](https://img.shields.io/travis/com/s3lite/s3lite)](https://travis-ci.com/s3lite/s3lite)
[![Code Coverage](https://img.shields.io/coveralls/github/s3lite/s3lite)](https://coveralls.io/github/s3lite/s3lite)
[![Node Version](https://img.shields.io/node/v/s3lite)](https://www.npmjs.com/package/s3lite)
[![NPM Version](https://img.shields.io/npm/v/s3lite)](https://www.npmjs.com/package/s3lite)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![License](https://img.shields.io/npm/l/s3lite)](https://github.com/s3lite/s3lite/blob/master/LICENSE)

A wrapper library for SQLite that keeps database file on Amazon S3 storage and adds support for promises and async/await.

## Table of contents

- [Usage](#usage)
- [How It Works](#how-it-works)
- [API Documentation](#api-documentation)
  - [S3Lite](#s3lite)
    - [S3Lite.database(s3FileName, [options])](#s3lite-database)
  - [Database](#database)
    - [Database.all(sql, [param, ...])](#databaseall)
    - [Database.get(sql, [param, ...])](#databaseget)
    - [Database.exec(sql)](#databaseexec)
    - [Database.run(sql, [param, ...])](#databaserun)
    - [Database.prepare(sql, [param, ...])](#databaseprepare)
    - [Database.close()](#databaseclose)
  - [Statement](#statement)
    - [Statement.all([param, ...])](#statementall)
    - [Statement.get([param, ...])](#statementget)
    - [Statement.run([param, ...])](#statementrun)
    - [Statement.reset()](#statementreset)
    - [Statement.finalize()](#statementfinalize)

## Usage

```
npm i --save s3lite
```

```javascript
const S3Lite = require('s3lite')
const db = S3Lite.database(
  'https://bucket-name.s3.eu-central-1.amazonaws.com/database.sqlite',
  {
    s3Options: {
      accessKeyId: 'AWS_ACCESS_KEY_ID',
      secretAccessKey: 'AWS_SECRET_ACCESS_KEY'
    }
  }
)

const data = await db.all('SELECT * FROM table WHERE column = ?', 'value')
```

## API Documentation

### Database

#### [Database.all](#databaseall)

`async` `all (sql, [params...])` `→` `{Promise<Array>}`

Perform a query

**Parameters:**

- `{string} sql`: The SQL query to run.
- `{...*|Object|Array} [params]` _(optional)_:

**Returns:**

- `{Promise<Array>}`:

```javascript
// async/await
const data = await db.all('SELECT id, name FROM table LIMIT 10')
// promise
db.all('SELECT id, name FROM table LIMIT 10').then(data => {
  console.log(data)
})
/*
[
  { id: 1, name: 'test1' },
  { id: 2, name: 'test2' }
]
*/
```

---

#### [Database.get](#databaseget)

`async` `get (sql, [params...])` `→` `{Promise<Object>}`

Perform a query

**Parameters:**

- `{string} sql`: The SQL query to run.
- `{...*|Object|Array} [params]` _(optional)_:

**Returns:**

- `{Promise<Object|undefined>}`:

```javascript
// async/await
const data = await db.get('SELECT id, name FROM table')
// promise
db.get('SELECT id, name FROM table').then(data => {
  console.log(data)
})
/*
{ id: 1, name: 'test1' }
*/
```

---

#### [Database.exec](#databaseexec)

`async` `exec (sql)` `→` `{Promise<Database>}`

Perform a query

**Parameters:**

- `{string} sql`: The SQL query to run.

**Returns:**

- `{Promise<Database>}`: Database object

```javascript
// async/await
await db.exec(`
  CREATE TABLE test(id INTEGER PRIMARY KEY, name TEXT, control INTEGER);
  INSERT INTO test VALUES(1, 'foo1', 1);
  INSERT INTO test VALUES(2, 'foo2', 2);
`)
// promise
db.exec(
  'CREATE TABLE test(id INTEGER PRIMARY KEY, name TEXT, control INTEGER)'
).then(databaseObject => {
  // databaseObject {Database}
})
```

---

#### [Database.run](#databaserun)

`async` `run (sql, [params...])` `→` `{Promise<{lastID: number, changes: number, sql: string}>}`

Perform a query

**Parameters:**

- `{string} sql`: The SQL query to run.
- `{...*|Object|Array} [params]` _(optional)_:

**Returns:**

- `{Promise<{lastID: number, changes: number, sql: string}>}`:

```javascript
// async/await
const result = await db.run("INSERT INTO test VALUES(NULL, 'foo1', 1)")
// promise
db.run("INSERT INTO test VALUES(NULL, 'foo1', 1)").then(result => {
  console.log(result)
})
/*
{ lastID: 1, changes: 1, sql: "INSERT INTO test VALUES(NULL, 'foo1', 1)" }
*/
```

---

#### [Database.prepare](#databaseprepare)

`async` `prepare (sql, [params...])` `→` `{Promise<Statement>}`

Prepare a statement

**Parameters:**

- `{string} sql`: The SQL query to run.
- `{...*|Object|Array} [params]` _(optional)_:

**Returns:**

- `{Promise<Statement>}`:

```javascript
// async/await
const stmt = await db.prepare("INSERT INTO test VALUES(NULL, ?, ?)")
// promise
db.prepare("INSERT INTO test VALUES(NULL, ?, ?)").then(stmt => {
  // stmt {Statement}
})
```

---

### Statement

#### [Statement.all](#statementall)

`async` `all ([params...])` `→` `{Promise<Array>}`

Perform a query

**Parameters:**

- `{...*|Object|Array} [params]` _(optional)_:

**Returns:**

- `{Promise<Array>}`:

```javascript
// async/await
const data = await stmt.all()
// promise
stmt.all().then(data => {
  console.log(data)
})
/*
[
  { id: 1, name: 'test1' },
  { id: 2, name: 'test2' }
]
*/
```

---

#### [Statement.get](#statementget)

`async` `get ([params...])` `→` `{Promise<Object>}`

Perform a query

**Parameters:**

- `{...*|Object|Array} [params]` _(optional)_:

**Returns:**

- `{Promise<Object|undefined>}`:

```javascript
// async/await
const data = await stmt.get()
// promise
stmt.get().then(data => {
  console.log(data)
})
/*
{ id: 1, name: 'test1' }
*/
```

---

#### [Statement.run](#statementrun)

`async` `run ([params...])` `→` `{Promise<Statement>}`

Perform a query

**Parameters:**

- `{...*|Object|Array} [params]` _(optional)_:

**Returns:**

- `{Promise<Statement>}`:

```javascript
// async/await
const result = await stmt.run('foo')
// promise
stmt.run('foo').then(stmt => {
  console.log(stmt)
})
/*
// stmt {Statement}
*/
```

---
