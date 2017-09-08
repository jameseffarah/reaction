import { Reaction } from "/server/api";

Reaction.registerPackage({
	label: "suppDogs Routes",
	name: "suppdogs-routes",
	icon: "fa fa-bath",
	meta: {
		version: "1.0.0"
	},
	autoEnable: true,
	registry: [
		{
			route: "/about",
			name: "about",
			template: "aboutUs",
			workflow: "coreWorkflow"
		}, {
			route: "/privacy",
			name: "privacy",
			template: "privacy",
			workflow: "coreWorkflow"
		}, {
			route: "/faq",
			name: "faq",
			template: "faq",
			workflow: "coreWorkflow"
		}
	],
	layout: [{
	    layout: "coreLayout",
	    workflow: "coreWorkflow",
	    theme: "default",
	    enabled: true,
	    priority: 1,
	    structure: {
	      template: "default",
	      layoutHeader: "layoutHeader",
	      layoutFooter: "layoutFooter",
	      notFound: "notFound",
	      dashboardHeader: "",
	      dashboardControls: "dashboardControls",
	      dashboardHeaderControls: "",
	      adminControlsFooter: "adminControlsFooter"
    } }
  ]
});