"""HTML page routes (server-rendered first paint, then live updates via JS)."""

from flask import Blueprint, render_template

from .. import models

views_bp = Blueprint("views", __name__)


@views_bp.get("/")
def index():
    """Service selection dashboard with live load badges."""
    return render_template(
        "index.html", services=models.list_services(), stats=models.global_stats()
    )


@views_bp.get("/ticket/<ticket_number>")
def ticket_page(ticket_number):
    ticket = models.get_ticket(ticket_number)
    if ticket is None:
        return render_template("not_found.html", ticket_number=ticket_number), 404
    return render_template("ticket.html", ticket=ticket)


@views_bp.get("/queue")
def queue_board():
    """Public display board: waiting lists per service."""
    services = models.list_services()
    boards = []
    for service in services:
        boards.append(
            {
                "service": service,
                "waiting": models.list_tickets(
                    service_id=service["id"], status="WAITING",
                    limit=12, waiting_first=True,
                ),
            }
        )
    return render_template(
        "queue.html", boards=boards, stats=models.global_stats()
    )


@views_bp.get("/admin")
def admin():
    """Staff panel: call next, complete, cancel."""
    services = models.list_services()
    sections = []
    for service in services:
        sections.append(
            {
                "service": service,
                "tickets": models.list_tickets(
                    service_id=service["id"], limit=15, waiting_first=True
                ),
            }
        )
    return render_template(
        "admin.html", sections=sections, stats=models.global_stats()
    )


@views_bp.get("/healthz")
def healthz():
    """Liveness probe used by Docker / load balancers."""
    return {"status": "ok", "service": "crowdcloud"}
