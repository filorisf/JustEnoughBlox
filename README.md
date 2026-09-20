# JustEnoughBlox

JustEnoughBlox enhances the Roblox experience

## v0.5.0

### Lists
- Private Lists stored in Chrome.
- Custom List thumbnails.
- Game thumbnails and live public Roblox information.
- Friend avatars when friends are currently playing an experience.
- Drag and drop game ordering.
- Offline RL1 share/import codes.
- **Recommended for this List**: analyzes the games in a List and uses Roblox search plus local similarity scoring to suggest games that fit the List.

### Devlog
Click the JustEnoughBlox icon in Chrome to open the extension popup and read the Devlog.

## Install / update
1. Extract the extension folder somewhere permanent.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Use **Load unpacked** the first time.
5. For an update, replace the files in the same folder and click **Reload** on JustEnoughBlox.

Existing Lists use the same storage keys and remain compatible. Experimental Smart Lists from v0.4.0 are removed during migration.


## JEB Seal of Quality feed

v0.7.0 can load the Seal dynamically from a free public GitHub JSON file. No JustEnoughBlox backend is required.

1. Create a public GitHub repository or Gist.
2. Copy `data/seal-template.json` to a file named `seal.json` and replace the example game with your curated entries.
3. Open the raw JSON file on GitHub and copy its `raw.githubusercontent.com` (or `gist.githubusercontent.com`) URL.
4. Click the JustEnoughBlox extension icon, paste that URL under **JEB Seal of Quality**, and press **Save feed**.
5. The extension caches the feed locally for 6 hours. The popup **Refresh** button forces an immediate reload.

Changing `seal.json` updates the JEB Seal selection without publishing a new extension version.


## v0.7.0 — Visual identity

Adds the official JEB logo, JEBot mascot sticker assets throughout the Roblox UI, and the compact red wax JEB Seal overlay for certified games.
