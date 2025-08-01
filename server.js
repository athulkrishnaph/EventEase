const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Use default middlewares (cors, static, logger)
server.use(middlewares);

// Add custom middleware to sync userRegistrations
server.use(jsonServer.bodyParser);

// Middleware to handle event deletion cleanup
server.use('/events/:id', (req, res, next) => {
  if (req.method === 'DELETE') {
    const eventId = req.params.id;
    const db = router.db;
    
    console.log(`DELETE request for event: ${eventId}`);
    
    // Find participations that reference this event
    const participations = db.get('participations').value();
    const orphanedParticipations = participations.filter(p => p.eventId === eventId);
    
    if (orphanedParticipations.length > 0) {
      console.log(`Found ${orphanedParticipations.length} participations to clean up for event ${eventId}`);
      
      // Delete orphaned participations
      orphanedParticipations.forEach(participation => {
        db.get('participations').remove({ id: participation.id }).write();
        console.log(`Deleted orphaned participation ${participation.id} for event ${eventId}`);
      });
    }
    
    // Continue with the normal DELETE process
    next();
  } else {
    next();
  }
});

// Middleware to sync userRegistrations when participations change
server.use('/participations', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE') {
    // Get current data
    const db = router.db;
    
    // After the request is processed, sync userRegistrations
    const originalSend = res.send;
    res.send = function(data) {
      try {
        syncUserRegistrations(db);
        originalSend.call(this, data);
      } catch (error) {
        console.error('Error syncing userRegistrations:', error);
        originalSend.call(this, data);
      }
    };
  }
  next();
});

// Function to sync userRegistrations with participations
function syncUserRegistrations(db) {
  const participations = db.get('participations').value();
  const users = db.get('users').value();
  const events = db.get('events').value();
  
  // Group participations by userId
  const userParticipations = {};
  participations.forEach(participation => {
    const userId = participation.userId;
    if (!userParticipations[userId]) {
      userParticipations[userId] = [];
    }
    
    // Find the event details
    const event = events.find(e => e.id === participation.eventId);
    if (event) {
      const participationData = {
        eventId: participation.eventId,
        eventTitle: event.title,
        status: participation.status,
        registrationDate: participation.registrationDate
      };
      
      // Only include attendance if status is 'Registered'
      if (participation.status === 'Registered' && participation.attendance) {
        participationData.attendance = participation.attendance;
      }
      
      userParticipations[userId].push(participationData);
    }
  });
  
  // Create userRegistrations array
  const userRegistrations = users
    .filter(user => user.role === 'user') // Only include regular users
    .map(user => ({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      registeredEvents: userParticipations[user.id] || [],
      totalRegistrations: (userParticipations[user.id] || []).length
    }));
  
  // Update the userRegistrations in the database
  db.set('userRegistrations', userRegistrations).write();
  console.log('userRegistrations synced successfully');
}

// Function to clean up orphaned participations
function cleanupOrphanedParticipations(db) {
  const participations = db.get('participations').value();
  const events = db.get('events').value();
  
  // Find orphaned participations (null eventId or non-existent events)
  const orphanedParticipations = participations.filter(participation => {
    return !participation.eventId || 
           participation.eventId === null || 
           participation.eventId === undefined ||
           !events.find(e => e.id === participation.eventId);
  });
  
  if (orphanedParticipations.length > 0) {
    console.log(`Found ${orphanedParticipations.length} orphaned participations to clean up`);
    
    orphanedParticipations.forEach(participation => {
      db.get('participations').remove({ id: participation.id }).write();
      console.log(`Deleted orphaned participation ${participation.id} with eventId: ${participation.eventId}`);
    });
    
    console.log('Orphaned participations cleanup completed');
  } else {
    console.log('No orphaned participations found');
  }
}

// Use the router
server.use(router);

// Start server
const port = 3000;
server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
  console.log('Auto-sync enabled for userRegistrations');
  console.log('Event deletion cleanup enabled');
  
  // Clean up orphaned participations on startup
  const db = router.db;
  cleanupOrphanedParticipations(db);
}); 