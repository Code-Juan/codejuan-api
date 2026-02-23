//client configuration
//add new clients here as you onboard them
//each client has a unique ID, their name, domain, and notification email
const clients = {
  //your own sites
  codejuan: {
    name: 'CodeJuan Portfolio',
    domain: 'codejuan.com',
    notificationEmail: null, //uses default from env
  },
  services: {
    name: 'CodeJuan Services',
    domain: 'services.codejuan.com',
    notificationEmail: null, //uses default from env
  },

  //client sites -- add entries as you onboard clients
  //example:
  //'wooden-stone': {
  //  name: 'The Wooden Stone LLC',
  //  domain: 'thewoodenstone.com',
  //  notificationEmail: 'owner@thewoodenstone.com',
  //},
};

function getClient(clientId) {
  return clients[clientId] || null;
}

function getAllClientIds() {
  return Object.keys(clients);
}

module.exports = { clients, getClient, getAllClientIds };
