import json
from pathlib import Path


COLLECTION_PATH = Path("sprint-shoes-auth-admin.postman_collection.json")
FOLDER_NAME = "Production Enhancements 2026"


def make_request(name: str, method: str, path: str, auth: str = "admin", body: dict | None = None):
    token_var = "{{adminAccessToken}}" if auth == "admin" else "{{userAccessToken}}"

    request = {
        "name": name,
        "request": {
            "method": method,
            "header": [
                {"key": "Authorization", "value": f"Bearer {token_var}"},
                {"key": "Content-Type", "value": "application/json"},
            ],
            "url": {
                "raw": "{{baseUrl}}" + path,
                "host": ["{{baseUrl}}"],
                "path": [p for p in path.split("/") if p],
            },
        },
    }

    if body is not None:
        request["request"]["body"] = {
            "mode": "raw",
            "raw": json.dumps(body, indent=2),
        }

    return request


def main() -> None:
    data = json.loads(COLLECTION_PATH.read_text())
    items = data.setdefault("item", [])

    items = [i for i in items if i.get("name") != FOLDER_NAME]

    folder = {
        "name": FOLDER_NAME,
        "item": [
            make_request("Admin Tax Rules - List", "GET", "/api/admin/tax-rules"),
            make_request(
                "Admin Tax Rules - Create",
                "POST",
                "/api/admin/tax-rules",
                body={"name": "Default Tax", "region": "US", "taxRate": 0.08, "priority": 10},
            ),
            make_request("Admin Shipping Rules - List", "GET", "/api/admin/shipping-rules"),
            make_request(
                "Admin Shipping Rules - Create",
                "POST",
                "/api/admin/shipping-rules",
                body={"name": "US Standard", "region": "US", "minimumOrder": 0, "shippingCost": 7.99},
            ),
            make_request("Returns - Details", "GET", "/api/returns/{{returnId}}", auth="user"),
            make_request("Returns - Cancel", "PATCH", "/api/returns/{{returnId}}/cancel", auth="user"),
            make_request("Returns - Timeline", "GET", "/api/returns/{{returnId}}/timeline", auth="user"),
            make_request("Returns - Reasons", "GET", "/api/returns/reasons", auth="user"),
            make_request("Admin Returns - Analytics", "GET", "/api/admin/returns/analytics"),
            make_request("Admin Returns - Export", "GET", "/api/admin/returns/export"),
            make_request("Admin Refunds - Analytics", "GET", "/api/admin/refunds/analytics"),
            make_request("Admin Refunds - Retry", "POST", "/api/admin/refunds/{{refundId}}/retry"),
            make_request("Admin Refunds - Export", "GET", "/api/admin/refunds/export"),
            make_request("Payment Methods - List", "GET", "/api/payment-methods", auth="user"),
            make_request(
                "Payment Methods - Add",
                "POST",
                "/api/payment-methods",
                auth="user",
                body={
                    "provider": "RAZORPAY",
                    "paymentMethod": "UPI",
                    "token": "pm_demo_token",
                    "upiId": "user@upi",
                    "isDefault": True,
                },
            ),
            make_request("Price Alerts - List", "GET", "/api/wishlist/price-alerts", auth="user"),
            make_request(
                "Price Alerts - Create",
                "POST",
                "/api/wishlist/price-alerts",
                auth="user",
                body={"productId": "{{productId}}", "targetPrice": 89.99},
            ),
            make_request("Order Stats", "GET", "/api/orders/stats", auth="user"),
            make_request("Upcoming Orders", "GET", "/api/orders/upcoming", auth="user"),
            make_request(
                "Update Order Address",
                "PATCH",
                "/api/orders/{{orderId}}/address",
                auth="user",
                body={"addressId": "{{addressId}}"},
            ),
            make_request("Admin Orders - Fulfillment Queue", "GET", "/api/admin/orders/fulfillment-queue"),
            make_request("Admin Orders - Delayed", "GET", "/api/admin/orders/delayed"),
            make_request(
                "Admin Orders - Assign Courier",
                "POST",
                "/api/admin/orders/bulk/assign-courier",
                body={"orderIds": ["{{orderId}}"], "courierName": "BlueDart"},
            ),
            make_request("Admin Orders - Export", "GET", "/api/admin/orders/export"),
            make_request(
                "Inventory Bulk Import",
                "POST",
                "/api/admin/inventory/bulk/import",
                body={"rows": [{"variantId": "{{variantId}}", "stockQuantity": 50, "reorderThreshold": 10}]},
            ),
            make_request("Inventory History", "GET", "/api/admin/inventory/{{variantId}}/history"),
            make_request("Inventory Forecast", "GET", "/api/admin/inventory/forecast"),
            make_request("My Reviews", "GET", "/api/reviews/my-reviews", auth="user"),
            make_request(
                "Update My Review",
                "PUT",
                "/api/reviews/my-reviews/{{reviewId}}",
                auth="user",
                body={"rating": 5, "reviewTitle": "Updated review"},
            ),
            make_request("Delete My Review", "DELETE", "/api/reviews/my-reviews/{{reviewId}}", auth="user"),
            make_request(
                "Review Helpful",
                "POST",
                "/api/products/{{productId}}/reviews/{{reviewId}}/helpful",
                auth="user",
            ),
            make_request("Review Summary", "GET", "/api/products/{{productId}}/reviews/summary"),
            make_request("Users Export", "GET", "/api/admin/users/export"),
            make_request("Users Segments", "GET", "/api/admin/users/segments"),
            make_request("Users Stats", "GET", "/api/admin/users/stats"),
            make_request("User Lifetime Value", "GET", "/api/admin/users/{{userId}}/lifetime-value"),
            make_request("Analytics Conversion Funnel", "GET", "/api/admin/analytics/conversion-funnel"),
            make_request("Analytics Abandoned Carts", "GET", "/api/admin/analytics/abandoned-carts"),
            make_request("Analytics Refunds", "GET", "/api/admin/analytics/refunds"),
            make_request("Analytics Shipping Performance", "GET", "/api/admin/analytics/shipping-performance"),
            make_request("Analytics Cohorts", "GET", "/api/admin/analytics/cohorts"),
        ],
    }

    items.append(folder)
    data["item"] = items
    COLLECTION_PATH.write_text(json.dumps(data, indent=2) + "\n")
    print("Postman collection updated")


if __name__ == "__main__":
    main()
