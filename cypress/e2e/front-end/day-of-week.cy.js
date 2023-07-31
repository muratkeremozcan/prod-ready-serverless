// @ts-check
it('should visit home page and check the day of the week', () => {
  cy.visit('/')
  cy.contains('Register')
  cy.contains('Sign in')

  const currentDay = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][new Date().getDay()]
  cy.contains('.dayOfWeek', currentDay)
})
