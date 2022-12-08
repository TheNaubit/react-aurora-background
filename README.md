# 🌌 React Aurora Component

My personal, lightweight, customizable and beautiful take for the typical background aurora effect we see in some websites using the glassmorphism style. Plug and play!

![React Aurora Component](./projectImage.jpg)

## 🎞️ Demo

You can see it working by yourself in this little demo: []()

## ✨ Features

- Uses TypeScript by default.
- It has both ESM and CJS modules, as well as type definitions.
- Minimal - Almost no dependencies!
- Fast
- SSR compatible!
- Customizable. Change everything. Colors, speed, blur...

## 🔧 How to install?

Just type this in your terminal:

```
npm install @nauverse/react-aurora-background
```

Or in case you are using `yarn`:

```
yarn add @nauverse/react-aurora-background
```

Also for `pnpm` (which was used for developing this component!):

```
pnpm i @nauverse/react-aurora-background
```

## ❓ How to use it?

Just wrap your app with it, like another provider.

```javascript
// 1. Import the provider
import { AuroraBackgroundProvider } from '@nauverse/react-aurora-background';

const MyApp = () => {
  return (
    // 2. Wrap your app with the provider and done!
    <AuroraBackgroundProvider>
      // The rest of your app
    </AuroraBackgroundProvider>
  );
};
```

If you want an example, you can check this [one](https://github.com/NauCode/react-aurora-background/blob/main/docs/docs.tsx).

### 🛠️ Settings

You can set some props to the provider to customize the behavior:
|Prop Name |Description |Default Value |
|--- |--- |--- |
|colors |It contains an array of color strings (hex, rgb or rgba) that will be used in the aurora background. |["#FC466B", "#3f5efb", "#F8FF00", "#3AD59F"] |
|numBubbles |It is the number of bubbles that creates the aurora effect. It can be an integer between 2 and 9 (both inclusive). I recommend to pick a number closer to the middle for the best experience. |4 |
|animDuration |It is a number greater than 0 (can be decimal). It is the duration in seconds of the aurora animation before it loops. |5 (seconds) |
|blurAmount |It can be a number or a string. It specifies the amount of blur the aurora will have. It sets a backdropFilter CSS property so the value must be a valid CSS value. If you pass a number, it will be converted to pixels by appending a "px" string after the number. If you pass a string, it must be a valid CSS value (like "5vw", "100%"...). |"10vw" |
|bgColor |It is the color of the background of the div containing the aurora. It is a color string (hex, rgb or rgba). |"#3f5efb" |
|useRandomness |It is a boolean. If enabled, instead of using always the same values for width, height and animation-delay properties on each bubble item, it will add some small randomness. |false |

## 🐛 Bugs, Issues and Contributing

This is an Open Source package so feel free to create an Issue or a Pull Request (or even to Fork it) if you want!

## 💭 Changelog

- **v1.0.0:** This is the first public version of the package, let's go! 🚀
