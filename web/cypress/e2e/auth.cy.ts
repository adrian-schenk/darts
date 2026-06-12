describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearCookies();
  });

  it('redirects unauthenticated users to login', () => {
    cy.visit('/home');

    cy.location('pathname').should('eq', '/login');
    cy.contains('h1', 'Login').should('be.visible');
  });

  it('logs in and leaves the login route', () => {
    cy.intercept('POST', '/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'test-access-token',
      },
    }).as('loginRequest');

    cy.visit('/login');

    cy.get('#username').type('alice');
    cy.get('#password').type('secret');
    cy.contains('button', 'Sign In').click();

    cy.wait('@loginRequest')
      .its('request.body')
      .should('deep.include', {
        username: 'alice',
        password: 'secret',
      });

    cy.location('pathname').should('not.eq', '/login');
  });
});