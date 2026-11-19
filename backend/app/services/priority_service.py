from app.models.issue import IssueSeverity, IssuePriority


def suggest_issue_priority(
    severity: IssueSeverity,
    is_safety_concern: bool,
) -> IssuePriority:

    if is_safety_concern:
        return IssuePriority.CRITICAL

    priority_mapping = {
        IssueSeverity.CRITICAL: IssuePriority.CRITICAL,
        IssueSeverity.HIGH: IssuePriority.HIGH,
        IssueSeverity.MEDIUM: IssuePriority.MEDIUM,
        IssueSeverity.LOW: IssuePriority.LOW,
    }

    return priority_mapping[severity]
