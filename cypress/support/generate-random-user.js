const chance = require('chance').Chance()

function generateRandomUser(mailosaurServerId) {
  const fullName = chance.name()
  const [firstName, lastName] = fullName.split(' ')
  const userName = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${chance.word(
    {
      length: 5,
    },
  )}`
  const email = `${userName}@${mailosaurServerId}.mailosaur.net`

  // Guaranteed one character from each pool
  const lowerCaseChar = chance.string({
    length: 1,
    pool: 'abcdefghijklmnopqrstuvwxyz',
  })
  const upperCaseChar = chance.string({
    length: 1,
    pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  })
  const digitChar = chance.string({length: 1, pool: '0123456789'})
  const specialChar = chance.string({length: 1, pool: '!@#$%^&*()'})

  // Remaining characters
  const remainingChars = chance.string({
    length: 12,
    pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()',
  })

  // Combine and shuffle them to create the password
  const password = chance
    .shuffle(
      (
        lowerCaseChar +
        upperCaseChar +
        digitChar +
        specialChar +
        remainingChars
      ).split(''),
    )
    .join('')

  return {fullName, firstName, lastName, userName, email, password}
}

module.exports = {
  generateRandomUser,
}

/*
So much easier with faker 

const generateRandomUser = (
  mailosaurServerId: string,
): {
  firstName: string
  lastName: string
  email: string
  password: string
} => {
  const firstName = faker.name.firstName()
  const lastName = faker.name.lastName()
  const email = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${faker.random.alphaNumeric(
    5,
  )}@${mailosaurServerId}.mailosaur.net`
  const password = faker.internet.password(16)

  return { firstName, lastName, email, password }
}

*/
