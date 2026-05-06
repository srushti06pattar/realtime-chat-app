function Sidebar({ users }) {
  return (
    <div className="w-64 bg-gray-800 p-4 border-r border-gray-700">
      <h2 className="text-white text-xl mb-4">
        Active Users
      </h2>

      {users.map((user, index) => (
        <div
          key={index}
          className="text-gray-300 mb-2"
        >
          • {user}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;
