# S3Lite → SQLite + S3

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
    - [Database.all(sql, [param, ...])](#database.all)
    - [Database.get(sql, [param, ...])](#database.get)
    - [Database.exec(sql)](#database.exec)
    - [Database.run(sql, [param, ...])](#database.run)
    - [Database.prepare(sql, [param, ...])](#database.prepare)
    - [Database.close()](#database.close)
  - [Statement](#statement)
    - [Statement.all([param, ...])](#statement.all)
    - [Statement.get([param, ...])](#statement.get)
    - [Statement.run([param, ...])](#statement.run)
    - [Statement.reset()](#statement.reset)
    - [Statement.finalize()](#statement.finalize)

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

#### Database.all

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

#### Database.get

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
db.all('SELECT id, name FROM table').then(data => {
  console.log(data)
})
/*
{ id: 1, name: 'test1' }
*/
```

---

#### Database.exec

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

#### Database.run

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

### Statement
