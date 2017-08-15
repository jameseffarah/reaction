import React, { Component } from "react";
import PropTypes from "prop-types";
import { Meteor } from "meteor/meteor";
import { composeWithTracker } from "@reactioncommerce/reaction-components";
import { Loading } from "@reactioncommerce/reaction-ui";
import { Orders, Media } from "/lib/collections";
import { i18next, Reaction } from "/client/api";
import OrdersList from "../components/orderList.js";
import { PACKAGE_NAME, ORDER_LIST_FILTERS_PREFERENCE_NAME, ORDER_LIST_SELECTED_ORDER_PREFERENCE_NAME, shippingStates } from "../../lib/constants";


class OrdersListContainer extends Component {
  static propTypes = {
    handleShowMoreClick: PropTypes.func,
    hasMoreOrders: PropTypes.func,
    invoice: PropTypes.object,
    orders: PropTypes.array,
    uniqueItems: PropTypes.array
  }

  constructor(props) {
    super(props);

    this.state = {
      selectedItems: [],
      orders: props.orders,
      multipleSelect: false,
      picked: false,
      packed: false,
      labeled: false,
      shipped: false,
      isLoading: {
        picked: false,
        packed: false,
        labeled: false,
        shipped: false
      }
    };
  }

  componentWillReceiveProps = (nextProps) => {
    this.setState({
      orders: nextProps.orders
    });
  }

  handleSelect = (event, isInputChecked, name) => {
    this.setState({
      multipleSelect: false
    });
    const selectedItemsArray = this.state.selectedItems;

    if (!selectedItemsArray.includes(name)) {
      selectedItemsArray.push(name);
      this.setState({
        selectedItems: selectedItemsArray
      });
    } else {
      const updatedSelectedArray = selectedItemsArray.filter((id) => {
        if (id !== name) {
          return id;
        }
      });
      this.setState({
        selectedItems: updatedSelectedArray
      });
    }
  }

  selectAllOrders = (orders, areAllSelected) => {
    if (areAllSelected) {
      // if all orders are selected, clear the selectedItems array
      // and set multipleSelect to false
      this.setState({
        selectedItems: [],
        multipleSelect: false
      });
    } else {
      // if there are no selected orders, or if there are some orders that have been
      // selected but not all of them, loop through the orders array and return a
      // new array with order ids only, then set the selectedItems array with the orderIds
      const orderIds = orders.map((order) => {
        return order._id;
      });
      this.setState({
        selectedItems: orderIds,
        multipleSelect: true
      });
    }
  }

  handleClick = (order, startWorkflow = false) => {
    Reaction.setActionViewDetail({
      label: "Order Details",
      i18nKeyLabel: "orderWorkflow.orderDetails",
      data: {
        order: order
      },
      props: {
        size: "large"
      },
      template: "coreOrderWorkflow"
    });

    if (startWorkflow === true) {
      Meteor.call("workflow/pushOrderWorkflow", "coreOrderWorkflow", "processing", order);
      Reaction.setUserPreferences(PACKAGE_NAME, ORDER_LIST_FILTERS_PREFERENCE_NAME, "processing");
    }

    Reaction.setUserPreferences(PACKAGE_NAME, ORDER_LIST_SELECTED_ORDER_PREFERENCE_NAME, order._id);
  }

  /**
   * Media - find media based on a product/variant
   * @param  {Object} item object containing a product and variant id
   * @return {Object|false} An object contianing the media or false
   */
  handleDisplayMedia = (item) => {
    const variantId = item.variants._id;
    const productId = item.productId;

    const variantImage = Media.findOne({
      "metadata.variantId": variantId,
      "metadata.productId": productId
    });

    if (variantImage) {
      return variantImage;
    }

    const defaultImage = Media.findOne({
      "metadata.productId": productId,
      "metadata.priority": 0
    });

    if (defaultImage) {
      return defaultImage;
    }
    return false;
  }

  /**
   * shippingStatusUpdateCall
   *
   * @summary set selected order(s) to the provided shipping state
   * @param {Array} selectedOrders - array of selected orders
   * @param {String} status - the shipping status to be set
   * @return {null} no return value
   */
  shippingStatusUpdateCall = (selectedOrders, status) => {
    this.setState({
      isLoading: {
        [status]: true
      }
    });
    let orderText;

    if (selectedOrders.length > 1) {
      orderText = "orders";
    } else {
      orderText = "order";
    }
    const capitalizeStatus = status[0].toUpperCase() + status.substr(1).toLowerCase();
    let orderCount = 0;

    selectedOrders.forEach((order) => {
      Meteor.call(`orders/shipment${capitalizeStatus}`, order, order.shipping[0], (err) => {
        if (err) {
          Alerts.toast(`An error occured while setting the status: ${err}`, "error");
        } else {
          Meteor.call("orders/updateHistory", order._id, "Shipping state set by bulk operation", status);
        }
        orderCount++;
        if (orderCount === selectedOrders.length) {
          Alerts.alert({
            text: i18next.t("order.orderSetToState", { orderNumber: selectedOrders.length, orderText: orderText, status: status }),
            type: "success"
          });
          this.setState({
            [status]: true,
            isLoading: {
              [status]: false
            }
          });
        }
      });
    });
  }

  displayOrderText = (selectedOrders) => {
    let orderText = "";
    if (selectedOrders.length > 1) {
      orderText = "Orders have";
    } else {
      orderText = "Order has";
    }

    return orderText;
  }

  displayAlert = (selectedOrders, status, whichFalseState, falsePreviousStatuses, falseCurrentState, trueCurrentState) => {
    const capitalizeStatus = status[0].toUpperCase() + status.substr(1).toLowerCase();
    let orderText = "";
    let skippedOrdersText = "";

    if (selectedOrders.length > 1) {
      orderText = "orders";
    } else {
      orderText = "order";
    }

    if (falsePreviousStatuses > 1) {
      skippedOrdersText = "are";
    } else {
      skippedOrdersText = "is";
    }

    if (falsePreviousStatuses) {
      Alerts.alert({
        text: i18next.t("order.skippedBulkOrdersAlert", {
          selectedOrders: selectedOrders.length, orderText: orderText, status: capitalizeStatus,
          numberOfSkippedOrders: falsePreviousStatuses, skippedOrdersText: skippedOrdersText, skippedState: whichFalseState
        }),
        type: "warning",
        showCancelButton: true,
        showCloseButton: true,
        allowOutsideClick: false,
        confirmButtonText: i18next.t("order.approveBulkOrderAction"),
        cancelButtonText: i18next.t("order.cancelBulkOrderAction")
      }, (setSelected) => {
        if (setSelected) {
          this.shippingStatusUpdateCall(selectedOrders, status);
        }
      });
    } else if (!falsePreviousStatuses && falseCurrentState) {
      this.shippingStatusUpdateCall(selectedOrders, status);
    } else if (!falsePreviousStatuses && !falseCurrentState && trueCurrentState) {
      Alerts.alert({
        text: i18next.t("order.orderAlreadyInState", { orderText: this.displayOrderText(selectedOrders), status: status })
      });
    }
  }

  pickedShippingStatus = (selectedOrders, status) => {
    let isPicked = false;

    selectedOrders.forEach((order) => {
      if (order.shipping[0].workflow.workflow.includes("coreOrderWorkflow/picked")) {
        if (order.shipping[0].workflow.status === "coreOrderWorkflow/picked") {
          isPicked = true;
        } else {
          isPicked = false;
        }
      } else {
        isPicked = false;
      }
    });

    if (isPicked) {
      Alerts.alert({
        text: i18next.t("order.orderAlreadyInState", { orderText: this.displayOrderText(selectedOrders), status: status })
      });
    } else this.shippingStatusUpdateCall(selectedOrders, status);
  }

  packedShippingStatus = (selectedOrders, status) => {
    let isNotPicked = 0;
    let isNotPacked = 0;
    let isPacked = 0;
    const whichFalseState = shippingStates.picked;

    selectedOrders.forEach((order) => {
      if (order.shipping[0].workflow.status === "new") {
        isNotPicked++;
      } else if (order.shipping[0].workflow.status === "coreOrderWorkflow/picked") {
        isNotPacked++;
      } else {
        if (order.shipping[0].workflow.status === "coreOrderWorkflow/packed") {
          isPacked++;
        }
      }
    });

    this.displayAlert(selectedOrders, status, whichFalseState, isNotPicked, isNotPacked, isPacked);
  }

  labeledShippingStatus = (selectedOrders, status) => {
    let isNotPacked = 0;
    let isNotLabeled = 0;
    let isLabeled = 0;
    let whichFalseState = "";

    selectedOrders.forEach((order) => {
      if (order.shipping[0].workflow.status === "new") {
        isNotPacked++;
        whichFalseState = shippingStates.picked;
      } else if (order.shipping[0].workflow.status === "coreOrderWorkflow/picked") {
        isNotPacked++;
        whichFalseState = shippingStates.packed;
      } else if (order.shipping[0].workflow.status === "coreOrderWorkflow/packed") {
        isNotLabeled++;
      } else {
        if (order.shipping[0].workflow.status === "coreOrderWorkflow/labeled") {
          isLabeled++;
        }
      }
    });

    this.displayAlert(selectedOrders, status, whichFalseState, isNotPacked, isNotLabeled, isLabeled);
  }


  shippedShippingStatus = (selectedOrders, status) => {
    let isNotLabeled = 0;
    let isNotShipped = 0;
    let isShipped = 0;
    let whichFalseState = "";

    selectedOrders.forEach((order) => {
      if (order.shipping[0].workflow.status === "new") {
        isNotLabeled++;
        whichFalseState = shippingStates.picked;
      } else if (order.shipping[0].workflow.status === "coreOrderWorkflow/picked") {
        isNotLabeled++;
        whichFalseState = shippingStates.packed;
      } else if (order.shipping[0].workflow.status === "coreOrderWorkflow/packed") {
        isNotLabeled++;
        whichFalseState = shippingStates.labeled;
      } else if (order.shipping[0].workflow.status === "coreOrderWorkflow/labeled") {
        isNotShipped++;
      } else {
        if (order.shipping[0].workflow.status === "coreOrderWorkflow/shipped") {
          isShipped++;
        }
      }
    });

    this.displayAlert(selectedOrders, status, whichFalseState, isNotLabeled, isNotShipped, isShipped);
  }

  /**
   * setShippingStatus
   *
   * @summary call the relevant method based on the provided shipping status
   * @param {String} status - the selected shipping status to be set
   * @param {Array} selectedOrdersIds - array of ids of the selected orders
   * @return {null} no return value
   */
  setShippingStatus = (status, selectedOrdersIds) => {
    const selectedOrders = this.state.orders.filter((order) => {
      return selectedOrdersIds.includes(order._id);
    });

    if (status === "picked") {
      this.pickedShippingStatus(selectedOrders, status);
    }

    if (status === "packed") {
      this.packedShippingStatus(selectedOrders, status);
    }

    if (status === "labeled") {
      this.labeledShippingStatus(selectedOrders, status);
    }

    if (status === "shipped") {
      this.shippedShippingStatus(selectedOrders, status);
    }
  }

  render() {
    return (
      <OrdersList
        handleSelect={this.handleSelect}
        orders={this.state.orders}
        handleClick={this.handleClick}
        displayMedia={this.handleDisplayMedia}
        selectedItems={this.state.selectedItems}
        selectAllOrders={this.selectAllOrders}
        multipleSelect={this.state.multipleSelect}
        setShippingStatus={this.setShippingStatus}
        shipped={this.state.shipped}
        packed={this.state.packed}
        labeled={this.state.labeled}
        picked={this.state.picked}
        isLoading={this.state.isLoading}
      />
    );
  }
}

const composer = (props, onData) => {
  const mediaSubscription = Meteor.subscribe("Media");
  const ordersSubscription = Meteor.subscribe("CustomPaginatedOrders");

  if (mediaSubscription.ready() && ordersSubscription.ready()) {
    const orders = Orders.find().fetch();

    onData(null, {
      uniqueItems: props.items,
      invoice: props.invoice,
      orders: orders
    });
  }
};

export default composeWithTracker(composer, Loading)(OrdersListContainer);
