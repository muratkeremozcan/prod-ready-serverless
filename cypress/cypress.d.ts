export {}

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      /**
       * Register and sign in a user. This command also uses the dataSession to store and reuse the user data.
       * @param user - The user details.
       * @param user.fullName - The full name of the user.
       * @param user.userName - The username of the user.
       * @param user.email - The email of the user.
       * @param user.password - The password of the user.
       * @returns Chainable<Subject>
       */
      registerAndSignIn(user: {
        fullName: string
        userName: string
        email: string
        password: string
      }): Chainable<Subject>

      /**
       * Function to make an HTTP request via Cypress. This function replicates the original Jest implementation,
       * using cy.request/cy.api instead of axios.
       * Pass in an 'opts' object for additional arguments:
       *  - 'body': for POST and PUT requests.
       *  - 'iam_auth': sign the HTTP request with IAM credentials.
       *  - 'auth': for the Authorization header, used for authentication against Cognito-protected endpoints.
       * @param relPath - The relative path for the HTTP request.
       * @param method - The HTTP method.
       * @param opts - (Optional) Settings for the HTTP request.
       * @returns Chainable<Subject> Promise object representing the response from the HTTP request.
       * @throws Will throw an error if the request fails.
       */
      viaHttp(
        relPath: string,
        method: string,
        opts?: object,
      ): Chainable<Subject>
    }
  }
}
