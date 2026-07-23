export function AssignmentSelector({ selectedUserIds = [], teamMembers = [], onChange }) {
  const toggleUser = (userId) => {
    onChange(
      selectedUserIds.includes(userId)
        ? selectedUserIds.filter((selectedId) => selectedId !== userId)
        : [...selectedUserIds, userId],
    );
  };

  return (
    <fieldset className="assignment-fieldset">
      <legend>Assegna a</legend>
      {teamMembers.length ? (
        <div className="assignment-options">
          {teamMembers.map((member) => (
            <label className="assignment-option" key={member.id}>
              <input
                checked={selectedUserIds.includes(member.id)}
                onChange={() => toggleUser(member.id)}
                type="checkbox"
              />
              <span>{member.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="field-help">Gli utenti compariranno qui dopo il primo accesso al CRM.</p>
      )}
    </fieldset>
  );
}
