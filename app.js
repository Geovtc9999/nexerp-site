/**
 * Point d'entrée Phusion Passenger (cPanel Application Manager).
 * Passenger charge `app.js` par défaut ; on délègue au serveur Express.
 */
require('./server.js');
