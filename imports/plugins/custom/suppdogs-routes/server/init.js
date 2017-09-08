import { check } from "meteor/check";
import { Packages, Shops } from "/lib/collections";
import { Hooks, Reaction, Logger } from "/server/api";


function addRolesToVisitors() {
  // Add the about permission to all default roles since it's available to all
  Logger.info("::: Adding about route permissions to default roles");
  const shop = Shops.findOne(Reaction.getShopId());
  Shops.update(shop._id, {
    $addToSet: { defaultVisitorRole: "about" }
  });
  Shops.update(shop._id, {
    $addToSet: { defaultRole: "about" }
  });
}

function addRolesToVisitors() {
  // Add the about permission to all default roles since it's available to all
  Logger.info("::: Adding privacy route permissions to default roles");
  const shop = Shops.findOne(Reaction.getShopId());
  Shops.update(shop._id, {
    $addToSet: { defaultVisitorRole: "privacy" }
  });
  Shops.update(shop._id, {
    $addToSet: { defaultRole: "privacy" }
  });
}

function addRolesToVisitors() {
  // Add the about permission to all default roles since it's available to all
  Logger.info("::: Adding faq route permissions to default roles");
  const shop = Shops.findOne(Reaction.getShopId());
  Shops.update(shop._id, {
    $addToSet: { defaultVisitorRole: "faq" }
  });
  Shops.update(shop._id, {
    $addToSet: { defaultRole: "faq" }
  });
}


/**
 * Hook to make additional configuration changes
 */
Hooks.Events.add("afterCoreInit", () => {
  addRolesToVisitors();
  addRolesToVisitors();
  addRolesToVisitors();
});