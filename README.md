![logo](/public/logo_small.webp)

# Quest Check
This is a matchmaker app between TTRPG publishers who need their upcoming works playtested, and TTRPG players and game masters, who are looking to playtest some cool stuff in exchange for a couple goodies.

The website is used to create playtests, browse playtests, apply to playtests, and accept/reject playtests.

It also comes with a corresponding Discord app, which notifies players about new playtest opportunities, so they don't have to change their daily routine and check the website regularly - the info is displayed where they were going to look anyway.

## Getting Started
* **Basic Setup**
    * Create a fork of this repository and clone your fork on your machine
    * Install nodejs: https://nodejs.org/en
    * Install mongodb: https://www.mongodb.com/docs/manual/installation/
    * Install dependencies: `npm i`
    * Create a `.env` file: `cp .env.example .env`
* **Clerk Configuration**
    * Create a free project on Clerk: https://clerk.com/
    * Go to **Users & Authentications** then **Social Connections**
        * Enable **Discord**, and add "guilds" in the "scopes" field
        * Enable **X / Twitter v2** 
        * *(the Facebook connection won't work in dev without manual verification by a Facebook employee, but isn't necessary to contribute to this project)*
    * Go to **API Keys** and copy the public & secret keys into your `.env` file
* **Discord Configuration**
    * Create a new application on Discord: https://discord.com/developers
    * Go to **Installation**
        * Select "Discord Provided Link" and "Guild Install"
        * In the default install settings, add the "bot" scope, and add "embed links", "send messages" and "mention everyone" permissions
        * Create a discord server, then use the discord provided link to install the bot to that server
    * Go to **Bot**
        * Click "Reset Token" and paste the token into your `.env` file
    * Go to **OAuth2**
        * Use the client ID and secret in your Clerk project, as described here: https://clerk.com/docs/authentication/social-connections/discord
* **Running the project**
    * Run in dev mode: `npm run dev`
    * Open `http://localhost:3000` with your web browser to see the result.
* **Contributing**
    * Make changes and commit them in a branch of your choice on your fork
    * Pull any changes that might have happened in the meantime from the main branch of the original repo, and solve any versioning conflicts that may arise
    * Use `npm run build` to ensure there are no errors
    * If your changes changed some database models, include a migration script in `src/server/migrate.ts`
    * Commit your changes (including a migration script if necessary), and create a pull request

## Directory Structure
* `public`: static files uploaded to the CDN directly, such as fonts, images, pdf files, etc.
* `src`
    * `components`: UI elements
        * `playtest`: elements with "business logic" in them
        * `skeleton`: elements to show as placeholders when a query is being ran
        * `utils`: elements without "business logic" in them, such as reusable form elements
    * `model`: typescript definitions and util functions
    * `pages`: HTTP URL endpoints. Important libraries: 
        * NextJS: https://nextjs.org/docs/pages
        * React: https://react.dev/reference/react
    * `server`: internal API. Important libraries: 
        * MongoDB: https://www.mongodb.com/docs/
        * TRPC: https://trpc.io/
        * Clerk: https://clerk.com/docs
        * Discord: https://discord.js.org/docs/packages/discord.js/14.14.1
    * `styles`: global, non-module-scoped styling

## Licence
<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.

The license only covers commits on the `main` branch made after March 20th, 2024, and only the contents of the `src` directory.
