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

This will add `@jangle/core` and `mongoose` to our `package.json` file, so we will be able to `require` them in our app!


### "I have Jangle Core installed!"

Great! The next step is to create `app.js`, the entrypoint to our NodeJS application.

In the text editor of your choice, create a file called `app.js`, and save it next to the `package.json` file.

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

To start our application, we can run:

```
node app.js
```

### "What next?"

The `jangle.start` function will returns a Promise, so we can safely handle any errors we might run into.

Anytime we spin up Jangle, there are two possibilities:

1. Jangle Core is running, and ready to go!

1. Something is wrong with the configuration / envirionment.

Let's update our app with a `.then` and `.catch` to handle each of the two cases:


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
  // Print `lists` if everything worked.
  .then(({ lists }) => console.log(lists))
  // Print the error message if something failed.
  .catch(reason => console.error(reason))
  // Exit the application when we're done.
  .then(_ => process.exit(0))
```

We've also added one more `.then` at the end to exit the application when we're done using or the error message.

Let's run `node app.js` again, to start the newer version!

If we forgot to start up our local database, the output would look like this:

```
Could not connect to MongoDB.
```

If everything went okay, our app should output something like this:

```
{ Person:
   { live:
      { any: [Function],
        count: [Function],
        find: [Function],
        get: [Function] },
     any: [Function],
     count: [Function],
     find: [Function],
     get: [Function],
     create: [Function],
     update: [Function],
     patch: [Function],
     remove: [Function],
     restore: [Function],
     isLive: [Function],
     publish: [Function],
     unpublish: [Function],
     history: [Function],
     previewRollback: [Function],
     rollback: [Function],
     schema: [Function] },
  BlogPost:
   { live:
      { any: [Function],
        count: [Function],
        find: [Function],
        get: [Function] },
     any: [Function],
     count: [Function],
     find: [Function],
     get: [Function],
     create: [Function],
     update: [Function],
     patch: [Function],
     remove: [Function],
     restore: [Function],
     isLive: [Function],
     publish: [Function],
     unpublish: [Function],
     history: [Function],
     previewRollback: [Function],
     rollback: [Function],
     schema: [Function] } }
```

Both `Person` and `BlogPost` are Jangle lists, which provide easy functions for editing, viewing, and publishing your content.

More detailed information is available in the [List API](), but for now, let's go through the basics:

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
  .then(({ lists: { Person, BlogPost } }) =>
    Person.create({
      name: 'Ryan',
      email: 'ryan@jangle.io'
    })
      .then(ryan =>
        BlogPost.create({
          title: 'Jangle is Easy!',
          author: ryan._id
        })
      )
      .then(blogPost =>
        Promise.all([
          Person.find(),
          BlogPost.find()
        ])
      )
      .then(([ people, blogPosts ]) => {
        console.log('people', people)
        console.log('blogPosts', blogPosts)
      })
  )
  .catch(reason => console.error(reason))
  .then(_ => process.exit(0))
```

Here we are doing a few things:

1. Creating a `Person` with name `Ryan` and email `ryan@jangle.io`

1. Creating a `BlogPost` with the title `Jangle is Easy!` and setting the author to `Ryan`.

1. Using `Promise.all` to `find` all people and blog posts, _in parallel_.

1. Logging the result of the `.find` queries to the console!

This is the output we get after running `node app.js` again:

```
people [ { _id: 5ab879fde2e1db7fdef1c510,
    name: 'Ryan',
    email: 'ryan@jangle.io',
    jangle:
     { version: 1,
       status: 'visible',
       created: [Object],
       updated: [Object] } } ]
blogPosts [ { _id: 5ab879fde2e1db7fdef1c511,
    title: 'Jangle is Easy!',
    author: 5ab879fde2e1db7fdef1c510,
    jangle:
     { version: 1,
       status: 'visible',
       created: [Object],
       updated: [Object] } } ]
```

The full app can be found over here: 

[jangle-cms/jangle-demo](https://github.com/jangle-cms/jangle-demo)

---

## That's all for now...

But many more docs are on the way!

Thanks for checking out Jangle!
