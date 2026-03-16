def recursive_loop(limit, current):
    if current < limit:
        print(current)
        recursive_loop(limit, current + 1)  # Call the function recursively with incremented value
    else:
        print(current)
        print("Restarting the loop...")
        recursive_loop(limit, 1)  # Reset the current variable to 1 to restart the loop

# Example usage
recursive_loop(5, 1)