const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

// Sends the "Always On" persistent nudge every 1.5 hours
exports.sendPersistentNudge = onSchedule("every 90 minutes", async (event) => {
  const usersSnap = await admin.firestore().collection("users").get();
  const promises = [];

  usersSnap.forEach((doc) => {
    const data = doc.data();
    if (data.fcmToken) {
      const payload = {
        token: data.fcmToken,
        data: {
          type: "persistent",
          title: "🍱 Lunchbox Vault — Always Active",
          body: "Your remembrance vault is pinned. Tap anytime to jump back in!"
        }
      };
      // Send silently without catching error to prevent halting the loop, log failures later
      promises.push(
        admin.messaging().send(payload)
        .catch(err => console.error(`Failed to send persistent nudge to ${doc.id}:`, err))
      );
    }
  });

  await Promise.all(promises);
  console.log(`Sent persistent nudges to ${promises.length} users.`);
});

// Sends the specific notebook nudge every 6 hours
exports.sendNotebookNudge = onSchedule("every 6 hours", async (event) => {
  const usersSnap = await admin.firestore().collection("users").get();
  const promises = [];

  usersSnap.forEach((doc) => {
    const data = doc.data();
    if (!data.fcmToken || !data.notebooks) return;

    const activeNotebooks = data.notebooks.filter(nb => !nb.archived);
    if (activeNotebooks.length === 0) return;

    // Pick a random notebook
    const targetNb = activeNotebooks[Math.floor(Math.random() * activeNotebooks.length)];
    const pendingItems = (targetNb.items || []).filter(i => !i.completed);
    
    let nudgeMessage = "";
    if (pendingItems.length > 0) {
      const randomItem = pendingItems[Math.floor(Math.random() * pendingItems.length)];
      nudgeMessage = `Hey! Don't forget: "${randomItem.title}" inside ${targetNb.title}. I'm right here whenever you want to unpack!`;
    } else {
      const nudgeMessages = [
        `Hey there! Just a friendly reminder from ${targetNb.title} — I'm right here in your Lunchbox whenever you're ready to check in!`,
        `Hey, I exist! Don't forget your thoughts and reminders packed inside ${targetNb.title}.`,
        `Mindful check-in: Take a quick look at ${targetNb.title} in your Lunchbox vault today!`,
        `Pippy says hi! Your ${targetNb.title} sketchbook is waiting for you whenever you have a free moment.`
      ];
      nudgeMessage = nudgeMessages[Math.floor(Math.random() * nudgeMessages.length)];
    }

    const payload = {
      token: data.fcmToken,
      data: {
        type: "notebook",
        title: `${targetNb.icon || '📝'} ${targetNb.title}`,
        body: nudgeMessage
      }
    };

    promises.push(
      admin.messaging().send(payload)
      .catch(err => console.error(`Failed to send notebook nudge to ${doc.id}:`, err))
    );
  });

  await Promise.all(promises);
  console.log(`Sent notebook nudges to ${promises.length} users.`);
});
