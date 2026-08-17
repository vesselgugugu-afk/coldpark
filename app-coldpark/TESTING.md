# coldpark testing

## Browser preview

Run a local static server from the `app-coldpark` folder and open `index.html` in a mobile-sized browser window.

Check these flows:

- Switch Discover, Chats, and Profile tabs.
- Filter the Discover list.
- Like a person and a feed post.
- Open a profile and start a chat.
- Send a message. Without `window.AiPhone`, the app uses a local fallback reply.
- Create a post and edit the profile.
- Toggle notifications and quiet mode.
- Reload the page and confirm local state remains.

## Music app integration

The Netease API URL is configured by the phone's built-in music app. coldpark
must not ask for, store, or ship that URL. Music attachments only store song
metadata such as name, artist, and cover; they do not store audio files or API
keys.

On the full phone, verify that a song is already playing in the built-in music
app, then open coldpark and use `Share current song`. Publish the post, tap its
music card, and confirm the host music app handles the play/open action. Also
test reposting the card to the profile and chat, then reopening coldpark.

The current standalone browser preview keeps the original local-player
fallback so the restored UI can be tested without the phone host. That
fallback is only a preview convenience; the final host integration still needs
the target phone's documented music bridge.

## Target phone

Upload the zip with `manifest.json` and `index.html` at its root. Then check:

- The `+` panel opens coldpark.
- Character generation uses `AiPhone.ai.generate`.
- App state is persisted through `AiPhone.app.data.read/write`.
- Share actions can send a card through `AiPhone.chat.sendCard`.
- The app respects host safe-area variables and closes through the host back control.

The current browser preview intentionally works without the host SDK, so it can be tested before installation.
