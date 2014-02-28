![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png) 

# sails-adapter-boilerplate

This template exists to make it easier for you to get started writing an adapter for Sails.js.

> ### Generator now available
>
> `$ sails generate adapter foo`
>
> (see https://github.com/balderdashy/sails-generate-adapter for the source.)




> ### WARNING
>
> This version of the adapter is for the upcoming v0.10 release of Sails / Waterline.
> Check out the 0.8 branch for the original stuff.



## Getting started
It's usually pretty easy to add your own adapters for integrating with proprietary systems or existing open APIs.  For most things, it's as easy as `require('some-module')` and mapping the appropriate methods to match waterline semantics.  To get started:

1. Fork this repository
2. Set up your `README.md` and `package.json` file.  Sails.js adapter module names are of the form sails-*, where * is the name of the datastore or service you're integrating with.
3. Build your adapter.

## How to test your adapter

Configure the interfaces you plan to support (and targeted version of Sails/Waterline) in the adapter's `package.json` file:

```javascript
{
  //...
  "sailsAdapter": {
    "sailsVersion": "~0.10.0",
    "implements": [
      "semantic",
      "queryable",
      "associations"
    ]
  }
}
```

In your adapter's directory, run:

```sh
$ npm test
```


## Publish your adapter

> You're welcome to write proprietary adapters and use them any way you wish--
> these instructions are for releasing an open-source adapter.

1. Create a [new public repo](https://github.com/new) and add it as a remote (`git remote add origin git@github.com:yourusername/sails-youradaptername.git)
2. Make sure you attribute yourself as the author and set the license in the package.json to "MIT".
3. Run the tests one last time.
4. Do a [pull request to sails-docs](https://github.com/balderdashy/sails-docs/compare/) adding your repo to `data/adapters.js`.  Please let us know about any special instructions for usage/testing. 
5. We'll update the documentation with information about your new adapter
6. Then everyone will adore you with lavish praises.  Mike might even send you jelly beans.

7. Run `npm version patch`
8. Run `git push && git push --tags`
9. Run `npm publish`

## About Sails.js and Waterline
http://sailsjs.org

Waterline is a new kind of storage and retrieval engine for Sails.js.  It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

## License

The MIT License (MIT)

Copyright (c) 2014 dozo

Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
