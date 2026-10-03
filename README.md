# tsi_workshop_html_2026_nr2
This is the class work from TSI

Open `index.html` in a browser. No installation or server is needed to play.

The Dragon Adoption Bureau form includes all required HTML control types.
Its GET/POST destinations are fictional and need a backend to process submissions.

## Tiny Rogue: The Ember Vault

A simple classic-inspired ASCII roguelike with exactly two randomly generated
floors, connected rooms and corridors, fog of war, turn-based monsters,
bump-to-attack combat, healing potions, hunger, food, gold, and permanent death.
Find the stairs on floor one, then recover the dragon egg on floor two to win.

Click or tab into the dungeon map before using the keyboard:

- Arrow keys, WASD, or HJKL: move; moving into a monster attacks it.
- P: drink a healing potion.
- Period: wait one turn.
- Greater-than (`>`): descend while standing on stairs.
- New expedition: reset the run with a new dungeon.

On-screen buttons support touch controls. Game keys only operate while the map
has focus, so typing in the application form works normally. Walls and invalid
commands do not consume turns. Monsters act after each successful action.

Original torch, egg, and combat slash SVG assets are in `assets/`.
Animations respect the reduced-motion preference.

Run game tests with `node --test tests/rogue.test.js`.

## GitHub user search

Use the GitHub search box to search public users via
`https://api.github.com/search/users?q=QUERY&per_page=10`.
The first ten matches appear as buttons. Select one to fetch their full profile
from `/users/USERNAME`, including avatar, name, bio, and account statistics.
No API key or installation is needed. Loading, empty results, timeout, and
request errors are shown with a retry option. Anonymous GitHub requests are
rate limited. The card stays aligned with the application form.

Selected profiles also show followers and following lists with links to their
GitHub accounts. Lists load 30 accounts at a time; use Load more to view the next
page. Each list supports empty states and independent retries.
