# Jangle Core | Documentation
> The core layer of Jangle CMS.

## Introduction

### What is Jangle Core?

__Jangle Core__ is a package for creating, updating, and viewing your website's content in your MongoDB instance. These docs are broken down into two categories:

1. __Guide__ - A step-by-step guide on how to get started with Jangle Core, from scratch!

1. __Docs__ - A breakdown of the functions and types, as well as explanations of Jangle Core's concepts.

If you're new to Jangle CMS, it is broken up into three layers: Jangle Core, Jangle API, and Jangle UI.

### Why use Jangle Core?

__Jangle Core__ adds three features on top of Mongoose:

- `Authentication` - Create and sign in users, to make sure your content is private and safe.

- `Publishing` - Save your work as a draft, before sharing it with the world.

- `History` - Easily recover from mistakes and see what content has changed over time.

---

## Guide
> Let's start using Jangle!


### "What will I need?"

1. [NodeJS](https://nodejs.org/en/download) - How we run the code.

1. [MongoDB](https://www.mongodb.com/download-center?jmp=nav#community) - Where we store the content.


### "I'm all set!"

Let's start my creating a new folder for our project:

```
mkdir jangle-demo
```

This command will create a folder called `jangle-demo`. Let's enter that folder now:

```
cd jangle-demo
```

Next, we'll want to create a new NodeJS project:

```
npm init -y
```

That command will make a `package.json` file, which is where NodeJS stores it's dependencies.

Let's add Jangle Core and Mongoose as our dependencies:

```
npm install --save @jangle/core mongoose
```

This will add `@jangle/core` and `mongoose` to our `package.json` file, so we will be able to `require` it in our app!


### "I have Jangle Core installed!"

Great! The next step is to create `app.js`, the entrypoint to our NodeJS application. In the text editor of your choice, create a file called `app.js`, and save it next to the `package.json` file.

__`./app.js`__
```js
const jangle = require('@jangle/core')
const { Schema } = require('mongoose')

jangle.start({
  user: {
    email: 'demo@jangle.com',
    password: 'password'
  },
  lists: {
    Person: new Schema({
      name: {
        type: String,
        required: true
      },
      email: {
        type: String
      }
    }),
    BlogPost: new Schema({
      title: {
        type: String,
        required: true
      },
      author: {
        type: Schema.Types.ObjectId,
        ref: 'Person'
      }
    })
  }
})
```

