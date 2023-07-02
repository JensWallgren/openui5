Goals
-----------
Create a minimal version of UI5.

- Make UI5 loadable via static file hosting. Right now there's an entire system where UI5 contains sub-libraries. If you want to distribute/host the library you must do it via a specialized web server that maps files (e.g. 'ui5 serve') or you must build a distributable version of UI5. Let's cut that out. Let's just have js source code that you could just copy to a server.
- Remove the AMD implementation. Instead simply use ES6 modules.
- Remove the meta object framework. It feels like UI5 has its own Object framework implemented, with its' own functionality for object definitions, inheritance etc. Let's try to remove this.
- Be ES6-first. UI5 suffers from a bit of pain due to backwards compatability. Let's make small, reasonable refactorings wherever modern JS can clean up/shorten existing UI5 code
- See how far we can push minifying UI5. What components are *really* needed?

Non-goals
----------
- Productive use.
