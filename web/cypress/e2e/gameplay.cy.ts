it('test game creation against bots', function() {
    cy.visit('http://localhost:5173/')
    
    cy.get('#username').click();
    cy.get('#username').type('user');
    cy.get('#password').type('user');
    cy.get('#app button.w-full').click();
    cy.get('#app a[href="/local-game"] span.text-sm').click();
    cy.get('#app button:nth-child(1) p.relative').click();
    cy.get('#input_0 div.formkit-inner > div:nth-child(1) > div.grid > button:nth-child(3) > div.font-bold').click();
    cy.get('#app button.font-bold').click();
    cy.contains('to throw');
    cy.get('#app g[filter="url(#sisalTexture-140)"] path:nth-child(61)').click();
    cy.get('.flex-row > :nth-child(1)')
});

it('test local game', function() {
    cy.visit('localhost:5173')
    
    cy.get('#username').click();
    cy.get('#username').type('user');
    cy.get('#password').type('user{enter}');
    cy.get('#app a[href="/local-game"]').click();
    cy.get('#app button:nth-child(1) p.relative').click();
    cy.get('#input_0 div.formkit-inner div:nth-child(1) div:nth-child(1) div.grid button:nth-child(3) div.mb-4').click();
    cy.get('#app main.w-full').click();
    cy.get('#input_0 div:nth-child(1) > input[type="number"]').clear();
    cy.get('#input_0 div:nth-child(1) > input[type="number"]').type('301');
    cy.get('#input_0 div.flex > div:nth-child(1)').click();
    cy.get('#input_0 div:nth-child(1) > div:nth-child(9) > button:nth-child(1) > div.mt-1').click();
    cy.get('#app button.font-bold').click();
    cy.get('#app circle[fill="url(#grad-red-141)"]').click({ force: true });
    cy.wait(5000)
    cy.get('[filter="url(#sisalTexture-141)"] > [d="M -2.5029514406436966 -15.803013449522203 L -15.487012038982872 -97.78114571891862 A 99 99 0 0 1 15.487012038982861 -97.78114571891864 L 2.502951440643695 -15.803013449522204 A 16 16 0 0 0 -2.5029514406436966 -15.803013449522203 Z"]').click({ force: true });
    cy.wait(5000)
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(41)').click({ force: true });
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(41)').click({ force: true });
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(41)').click({ force: true });
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(1)').click({ force: true });
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(1)').click({ force: true });
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(1)').click({ force: true });
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(41)').click({ force: true });
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(41)').click({ force: true });
    cy.get('#app g[filter="url(#sisalTexture-138)"] path:nth-child(2)').click({ force: true });
    cy.contains('has won')
});