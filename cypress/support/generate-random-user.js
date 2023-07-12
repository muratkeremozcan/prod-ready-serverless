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
  const password = chance.string({
    length: 16,
    pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()',
  })

  return {fullName, firstName, lastName, userName, email, password}
}

module.exports = {
  generateRandomUser,
}
