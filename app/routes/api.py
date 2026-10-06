"""REST API blueprint.

JSON endpoints used by the web UI, by curl smoke-tests, by the demo
scenario script and by the load-testing tool.  Keeping the API separate
from the HTML pages is what makes realistic benchmarking possible:
load tools exercise the same code path a real client uses.
"""

from flask import Blueprint, jsonify, request

from .. import models
from ..load_status import LEVELS

api_bp = Blueprint("api", __name__, url_prefix="/api")


def _error(message: str, status: int = 400):
    return jsonify({"error": message}), status


def _resolve_service(payload):
    """Find a service from JSON body keys (id or code)."""
    if payload is None:
        return None
    service_id = payload.get("service_id")
    service_code = payload.get("service_code") or payload.get("service")
    if service_id is not None:
        return models.get_service(service_id)
    if service_code:
        return models.get_service(str(service_code).strip().lower())
    return None


# --------------------------------------------------------------- services


@api_bp.get("/services")
def get_services():
    """All services with live queue stats and load level."""
    return jsonify({"services": models.list_services(), "stats": models.global_stats()})


@api_bp.get("/stats")
def get_stats():
    """Global counters and overall load level."""
    return jsonify(models.global_stats())


@api_bp.post("/services/<identifier>/next")
def call_next(identifier):
    """Staff action: call the next waiting customer of a service."""
    service = models.get_service(identifier)
    if service is None:
        return _error("service not found", 404)
    ticket = models.call_next(service["id"])
    if ticket is None:
        return jsonify({"message": "no waiting tickets", "ticket": None})
    return jsonify({"ticket": ticket})


# --------------------------------------------------------------- tickets


@api_bp.post("/tickets")
def create_ticket():
    """Issue a new queue ticket.

    Body (JSON or form): {"service_code": "it_support", "customer_name": "Ali"}
    """
    payload = request.get_json(silent=True)
    if payload is None:
        payload = request.form.to_dict()
    if not any(k in payload for k in ("service_code", "service", "service_id")):
        return _error("a valid 'service_code' or 'service_id' is required", 400)
    service = _resolve_service(payload)
    if service is None:
        return _error("service not found", 404)
    customer_name = (payload.get("customer_name") or "").strip()
    try:
        ticket = models.create_ticket(service["id"], customer_name)
    except Exception:
        return _error("could not create ticket, please retry", 500)
    if ticket is None:
        return _error("service not found", 404)
    return jsonify({"ticket": ticket, "service": service}), 201


@api_bp.get("/tickets")
def get_tickets():
    """List tickets. Filters: ?service_code=it_support&status=WAITING&limit=50"""
    service = None
    identifier = request.args.get("service_code") or request.args.get("service_id")
    if identifier:
        service = models.get_service(identifier)
        if service is None:
            return _error("service not found", 404)
    status = request.args.get("status", "").strip().upper() or None
    if status and status not in models.TICKET_STATUSES:
        return _error(f"invalid status, expected one of {models.TICKET_STATUSES}", 400)
    try:
        limit = min(500, max(1, int(request.args.get("limit", 50))))
    except ValueError:
        limit = 50
    tickets = models.list_tickets(
        service_id=service["id"] if service else None,
        status=status,
        limit=limit,
        waiting_first=bool(request.args.get("waiting_first")),
    )
    return jsonify({"tickets": tickets, "count": len(tickets)})


@api_bp.get("/tickets/<ticket_number>")
def get_ticket(ticket_number):
    """One ticket with live position, estimated wait and service load."""
    ticket = models.get_ticket(ticket_number)
    if ticket is None:
        return _error("ticket not found", 404)
    return jsonify({"ticket": ticket})


@api_bp.post("/tickets/<ticket_number>/status")
def set_ticket_status(ticket_number):
    """Staff action: change ticket status (SERVING / DONE / CANCELLED)."""
    payload = request.get_json(silent=True) or request.form.to_dict()
    new_status = (payload.get("status") or "").strip().upper()
    if new_status not in models.TICKET_STATUSES:
        return _error(f"invalid status, expected one of {models.TICKET_STATUSES}", 400)
    try:
        ticket = models.update_ticket_status(ticket_number, new_status)
    except ValueError as exc:
        return _error(str(exc), 409)
    if ticket is None:
        return _error("ticket not found", 404)
    return jsonify({"ticket": ticket})


@api_bp.post("/tickets/<ticket_number>/cancel")
def cancel_ticket(ticket_number):
    """Customer action: cancel a waiting ticket."""
    try:
        ticket = models.cancel_ticket(ticket_number)
    except ValueError as exc:
        return _error(str(exc), 409)
    if ticket is None:
        return _error("ticket not found", 404)
    return jsonify({"ticket": ticket})


# --------------------------------------------------------------- demo utils


@api_bp.post("/demo/reset")
def demo_reset():
    """Reset the database to a clean state (live-demo convenience).

    Intended for the demonstration environment only; remove or protect
    this route before any real deployment.
    """
    models.reset_all()
    return jsonify({"reset": True, "stats": models.global_stats()})


@api_bp.get("/load-levels")
def load_levels():
    """Expose the three load levels and current thresholds."""
    from flask import current_app

    return jsonify(
        {
            "levels": list(LEVELS),
            "busy_threshold": current_app.config["BUSY_THRESHOLD"],
            "high_threshold": current_app.config["HIGH_THRESHOLD"],
            "rule": "NORMAL < busy_threshold <= BUSY < high_threshold <= HIGH LOAD",
        }
    )
