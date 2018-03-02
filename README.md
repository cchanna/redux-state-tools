# Redux State Tools [![npm](https://img.shields.io/npm/v/redux-state-tools.svg)](https://www.npmjs.com/package/redux-state-tools)

A zero-depedency library for organizing your redux state into modules.

```shell
npm i --save redux-state-tools
```

## First, an example

Lets say we are building a simple todo list application, where we can create todos, and then clear all of them at once. We'll start with our todo state.
```js
// src/state/todos.js
import { combineReducers } from 'redux';

const ADD = "ADD";
const CLEAR = "CLEAR";

export const actions = {
  add: [EDIT, "id", "name"],
  login: LOGIN
};

export const reducers = combineReducers({
  ids: (state = [], action) => {
    switch (action.type) {
      case ADD:
        return [...state, action.id];
      case CLEAR:
        return [];
      default:
        return state;
    }
  },
  byId: (state = [], action) => {
    switch (action.type) {
      case ADD:
        return {
          ...state,
          [action.id]: {
            id: action.id,
            name: action.name
          }
        };
      case CLEAR:
        return {};
      default:
        return state;
    }
  }
});

const list = state => state.ids.map(id => state.byId[id]);
const get = (state, id) => state.ids[id];

export const selectors = {
  list,
  get
};
```

Now, let's look at the interface for our whole state module. The reducer exported from this can be dropped right into wherever you set up your redux store.

```js
// src/state/index.js
import { combineReducers } from 'redux';
import { 
  prefixedReducer, 
  prefixedActionCreators, 
  prefixedSelectors 
} from 'redux-state-tools';
import * as todos from './todos';

export const forTodos = prefixedActionCreators("TODO", todos.actions);
export const fromTodos = prefixedSelectors("todos", todos.state);

export const reducer = combineReducers({
  todos: prefixedReducer("TODO", todos.reducer)
});
```

And here's how we'd use it in a redux container component in react:

```js
// src/containers/todos.js
import { connect } from 'react-redux';
import { fromTodos, forTodos } = '../state';
import Todos from '../components/Todos.js';

const mapStateToProps = state => {
  return {
    todos: fromTodos.list(state)
  }
};

const mapDispatchToProps = {
  addTodo: forTodos.add,
  clearTodo: forTodos.clear
};

export default connect(mapStateToProps, mapDispatchToProps)(Todos);
```

By following this stucture, all knowledge of how the state is modified and accessed is contained entirely inside your _state_ folder. You can refactor your state by pulling related functionality into seperate files without ever having to touch the components outside.

## Exports

### `makeActionCreators(actions)`
Takes an object describing a collection of action creators for transforming the
state. Each action creator is either a single string for the actino type, or an
array with the type of the first element, followed by a list of property names
to be passed through to the action object.

```js
import { makeActionCreators } from 'redux-state-tools';

const USER_EDIT = "USER_EDIT";
const USER_LOGIN = "USER_LOGIN";

export const forUsers = makeActionCreators({
  edit: [USER_NAME_SET, "name", "favoriteColor"],
  login: USER_LOGIN
});

// the above is identical to the following:

export const forUsers = {
  setName: args => {
    return {
      type: USER_NAME_SET,
      name: args.name,
      favoriteColor: args.favoriteColor
    }
  },
  login: args => {
    return {
      type: USER_LOGIN
    }
  }
}
```

Defining the property names in this manner forces you to explicitly declare the
contracts of yours action creators.

### `prefixedActions(prefix, actions)`
Takes an argument in the shape you would pass into `makeActionCreators()`, and prefixes the types of those actions with the given value.

```js
import { prefixedActions } from 'redux-state-tools';

const EDIT = "EDIT";
const LOGIN = "LOGIN";

export const actions = prefixedActions("USER", {
  edit: [EDIT, "name", "favoriteColor"],
  login: LOGIN
});

// the above is identical to the following:

export const actions = {
  edit: ["USER_EDIT", "name", "favoriteColor"],
  login: "USER_LOGIN"
}
```

### `prefixedActionCreators(prefix, actions)`
Shorthand for combining `prefixedActions()` and `makeActionCreators()`.

```js
import { prefixedActionCreators } from 'redux-state-tools';
import * as users from './users';

export const forUsers = prefixedActionCreators("USER", users.actions);

// the above is identical to the following:

export const forUsers = makeActionCreators(prefixedActions("USER", users.actions));
```

### `prefixedReducer(prefix, reducer, exceptions?)`
Wrap a reducer with a prefix. Any actions passed into it without the given prefix are ignored. Actions passed *with* the prefix have the prefix stripped before they are passed through. This allows your reducer to share the action type constants you used for `prefixedActions()`, and saves performance when irrelevant actions are being passed through.

The optional `exceptions` argument lets you pass an array of actions that will always be passed through without modification.

```js
import { combineReducers } from 'redux';
import { prefixedReducer } from 'redux-state-tools';
import * as users from './users';

export const reducer = combineReducers({
  users: prefixedReducer("USER", users.reducer)
});
```

### `prefixedSelectors(prefix, selectors)`
Given an object with selectors which take the state as their first argument as values, wraps those selectors to use the state object described by `prefix`.

```js
import { prefixedSelectors } from 'redux-state-tools';

const getActiveUser = state => state.activeUser;
const getUser = (state, id) => state.usersById[id];

export const fromUsers = prefixedSelectors("users", {
  getActiveUser,
  getUser
});

// the above is identical to the following:

export const fromUsers = {
  getActiveUser: state => getActiveUser(state.users),
  getUser: (state, id) => getUser(state.users, id)
}
```


### `makeMiddleware(key, function(action, {dispatch, getState, next}))`
Make a special middleware that can be passed into your store and plays nicely with `makeActionCreators()`. It's best explained with an example.

```js
// in your state

const REFRESH = "REFRESH";
const ADD = "ADD";
const CLEAR = "CLEAR";

export const actions = {
  refresh: REFRESH,

  //signal that we want to use our refresh middleware for these actions
  add: ["ADD", "!refresh", "id", "name"],
  clear: ["CLEAR", "!refresh"]
}



// in wherever you set up your store

import { makeMiddleware } from 'redux-state-tools';
import { forUsers } from './state';

// set up the middleware to handle the !refresh actions
// in this case, we trigger a refresh after performing the action.
const refreshUsersMiddleware = makeMiddleware("refresh", (action, {dispatch, next}) => {
  const result = next(action);
  dispatch(forUsers.refresh());
  return result;
});
```

### `withMiddleware(key, actions)`
Flag a set of actions to use a middleware, as set up with `makeMiddleware()`.

```js
import { withMiddleware } from 'redux-state-tools';

const refreshed = actions => withMiddleware("refresh", actions);

const REFRESH = "REFRESH";
const ADD = "ADD";
const CLEAR = "CLEAR"

// this produces the same result as from the makeMiddleWare() example.
export const actions = {
  refresh: REFRESH,
  ...refreshed({
    add: [ADD, "id", "name"],
    clear: CLEAR
  })
};
```