# EIIP

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Dashboard inspection charts

The results and reasons charts display the current calendar month and the preceding two months,
using prototype completion records from `src/app/dashboard-inspection-data.ts`, not legacy
appointment dates. Each month has five grouped bars stacked by the selected candidate characteristic.
Results use muted forest/sage greens and amber/gold accents; reasons use brand blue with indigo,
violet, slate and teal companions.
Lighter shades identify New or Individual candidates; darker shades identify Established or
Organization candidates. Click a chart card (or press Enter/Space while focused) to view category
totals and monthly breakdowns. Both tables use the same completion records as the charts.
The blue candidate legend sits inside the Total Active Candidates card; bar-chart shade labels
are separated by a vertical divider.
Table columns wrap to fit the modal width without horizontal scrolling.
New/Established and Individual/Organization are separate breakdowns of the same population;
the Total row counts each inspection once.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
