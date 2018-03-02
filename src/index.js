const mapObject = (obj, fn) => {
  const result = {};
  Object.keys(obj).forEach(key => {
    result[key] = fn(obj[key]);
  });
  return result;
}

export const prefixedReducer = (prefix, reducer, exceptions = undefined) => (state, action) => {
  if (state === undefined) return reducer(state, action);
  if (exceptions && exceptions.includes(action.type)) return reducer(state, action);
  const { type, ...rest } = action;
  if (type.startsWith(prefix + "_")) {
    return reducer(state, {
      ...rest,
      type: type.slice(prefix.length + 1)
    }) 
  } 
  return state;
}

export const prefixedTypes = (prefix, actions) => {
  const convert = type => `${prefix}_${type}`;
  return mapObject(actions, convert);
}

export const prefixedActions = (prefix, actions) => {
  const convertToActionCreator = (arg) => {
    if (typeof arg === "string") {
      return `${prefix}_${arg}`;
    }
    else {
      const [type, ...args] = arg;
      return [`${prefix}_${type}`, ...args];
    }
  }
  return mapObject(actions, convertToActionCreator);
}

const makeActionCreator = arg => {
  let type;
  let params = [];
  if (Array.isArray(arg)) {
    type = arg[0];
    params = arg.slice(1);
  }
  else {
    type = arg;
  }
  params.forEach(param => {
    if (typeof param !== "string") throw new Error("the arguments to actionCreator must all be strings"); 
  });
  return args => {
    const result = {type};
    params.forEach(param => {
      if (param[0] === '!') {
        result[param] = true;
      }
      else {
        result[param] = args[param];
      }
    });
    return result;
  }
}

export const makeActionCreators = (actions) => mapObject(actions, makeActionCreator);

export const prefixedActionCreators = (prefix, actions) => makeActionCreators(prefixedActions(prefix, actions));

export const prefixedSelectors = (prefix, selectors) => 
  mapObject(selectors, selector => (state, ...args) => selector(state[prefix], ...args));

export const makeMiddleware = (key, func) => {
  return ({ dispatch, getState }) => next => actionIn => {
    if (actionIn["!" + key]) {
      const action = {...actionIn};
      delete action["!" + key];
      return func(action, {dispatch, getState, next});
    }
    else {
      return next(actionIn);
    }
  }
}

const appendItems = (arg, items) => {
  if (Array.isArray(arg)) return [...arg, ...items];
  else return [arg, ...items];
}

const append = (arg, item) => {
  if (Array.isArray(arg)) return [...arg, item];
  else return [arg, item];
};

export const withMiddleware = (key, actions) => mapObject(actions, arg => append(arg, "!" + key));