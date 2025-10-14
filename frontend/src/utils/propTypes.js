const describeValue = (value) => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Date) return 'date'
  return typeof value
}

const createChainableTypeChecker = (validate, expectedDescription, options = {}) => {
  const checkType = (isRequired, props, propName, componentName = '<<anonymous>>') => {
    const value = props[propName]

    if (value === null || value === undefined) {
      if (isRequired) {
        console.warn(
          `[PropTypes] Prop "${propName}" is marked as required in "${componentName}", but its value is ${String(value)}.`,
        )
      }
      return null
    }

    const isValid = validate(value, props, propName, componentName)
    if (!isValid) {
      console.warn(
        `[PropTypes] Invalid prop "${propName}" supplied to "${componentName}". Expected ${expectedDescription}, ` +
          `but received ${describeValue(value)}.`,
      )
      return null
    }

    if (options.afterValidate) {
      options.afterValidate(value, props, propName, componentName)
    }

    return null
  }

  const chainedCheck = checkType.bind(null, false)
  chainedCheck.isRequired = checkType.bind(null, true)
  chainedCheck._validate = (value) => value === null || value === undefined || validate(value)
  chainedCheck._expectedDescription = expectedDescription
  return chainedCheck
}

const createPrimitiveTypeChecker = (expectedType) =>
  createChainableTypeChecker((value) => typeof value === expectedType, expectedType)

const createArrayOfTypeChecker = (typeChecker) => {
  const validate = (value) => {
    if (!Array.isArray(value)) return false
    if (!typeChecker || typeof typeChecker !== 'function') return true
    return value.every((item) => {
      if (typeChecker._validate) {
        return typeChecker._validate(item)
      }
      return true
    })
  }

  const afterValidate = (value, props, propName, componentName) => {
    if (!Array.isArray(value)) return
    if (!typeChecker || typeof typeChecker !== 'function') return
    value.forEach((item, index) => {
      try {
        typeChecker({ [`${propName}[${index}]`]: item }, `${propName}[${index}]`, componentName)
      } catch (err) {
        // Ignore errors from custom validators
      }
    })
  }

  const description = `an array of ${typeChecker?._expectedDescription ?? 'the specified type'}`
  const checker = createChainableTypeChecker(validate, description, { afterValidate })
  checker._validate = (value) => {
    if (value === null || value === undefined) return true
    if (!Array.isArray(value)) return false
    return value.every((item) => (typeChecker && typeChecker._validate ? typeChecker._validate(item) : true))
  }
  return checker
}

const createUnionTypeChecker = (checkers) => {
  const filteredCheckers = Array.isArray(checkers) ? checkers.filter(Boolean) : []
  const validate = (value) =>
    filteredCheckers.some((checker) => {
      if (checker && typeof checker._validate === 'function') {
        return checker._validate(value)
      }
      return true
    })

  const descriptionParts = filteredCheckers
    .map((checker) => checker?._expectedDescription)
    .filter(Boolean)
  const description = descriptionParts.length > 0 ? descriptionParts.join(', ') : 'one of the specified types'

  return createChainableTypeChecker(validate, description)
}

const PropTypes = {
  string: createPrimitiveTypeChecker('string'),
  number: createPrimitiveTypeChecker('number'),
  bool: createPrimitiveTypeChecker('boolean'),
  func: createPrimitiveTypeChecker('function'),
  arrayOf: (typeChecker) => createArrayOfTypeChecker(typeChecker),
  oneOfType: (checkers) => createUnionTypeChecker(checkers),
}

export default PropTypes
