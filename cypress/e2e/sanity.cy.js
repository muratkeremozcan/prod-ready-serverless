it('should visit base url', () => {
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
