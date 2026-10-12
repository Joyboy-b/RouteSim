#include <chrono>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

struct Point {
  double lat;
  double lng;
};

struct VehicleSeed {
  std::string driver;
  std::string passenger;
  std::string vehicle;
  std::vector<Point> route;
};

Point interpolate(const std::vector<Point>& route, double progress) {
  const double scaled = progress * static_cast<double>(route.size() - 1);
  const int startIndex = std::min(static_cast<int>(std::floor(scaled)), static_cast<int>(route.size()) - 2);
  const double local = scaled - startIndex;
  const Point start = route[startIndex];
  const Point end = route[startIndex + 1];
  return {start.lat + (end.lat - start.lat) * local, start.lng + (end.lng - start.lng) * local};
}

std::string isoNow() {
  const auto now = std::chrono::system_clock::now();
  const auto time = std::chrono::system_clock::to_time_t(now);
  std::tm utc{};
#ifdef _WIN32
  gmtime_s(&utc, &time);
#else
  gmtime_r(&time, &utc);
#endif
  std::ostringstream out;
  out << std::put_time(&utc, "%Y-%m-%dT%H:%M:%SZ");
  return out.str();
}

void writePoint(std::ostream& out, const Point& point) {
  out << "{\"lat\":" << std::fixed << std::setprecision(6) << point.lat << ",\"lng\":" << point.lng << "}";
}

int main() {
  const std::vector<VehicleSeed> seeds = {
      {"Ava Chen", "L. Morgan", "Tesla Model 3", {{40.7484, -73.9857}, {40.7527, -73.9772}, {40.758, -73.973}, {40.7648, -73.9808}}},
      {"Marco Reed", "J. Avery", "Toyota Camry", {{40.7359, -74.0036}, {40.742, -73.9969}, {40.7492, -73.9875}, {40.7557, -73.9787}}},
      {"Samira Holt", "M. Stone", "Hyundai Ioniq", {{40.7708, -73.9822}, {40.7667, -73.9734}, {40.759, -73.969}, {40.7505, -73.9934}}},
      {"Diego Cruz", "R. Hayes", "Ford Escape", {{40.7295, -73.9965}, {40.7364, -73.9904}, {40.744, -73.982}, {40.7519, -73.9771}}},
      {"Nina Patel", "K. Brooks", "Kia Niro", {{40.7829, -73.9654}, {40.7751, -73.9706}, {40.7673, -73.9819}, {40.7591, -73.9845}}},
      {"Theo Banks", "T. Fisher", "Honda Accord", {{40.7061, -74.0086}, {40.715, -74.003}, {40.724, -73.994}, {40.7339, -73.9908}}},
  };

  int tick = 0;
  while (true) {
    const std::string timestamp = isoNow();
    std::cout << "{\"city\":\"Manhattan\",\"generatedAt\":\"" << timestamp << "\",\"vehicles\":[";
    for (size_t index = 0; index < seeds.size(); ++index) {
      const auto& seed = seeds[index];
      const double progress = std::fmod(tick * (0.007 + index * 0.0014) + index * 0.13, 1.0);
      const int delay = std::max(0, static_cast<int>(std::round(std::sin(tick / 16.0 + index) * 3 + index * 0.35)));
      const std::string state = progress > 0.92 ? "dropoff" : progress > 0.48 ? "en_route" : progress > 0.38 ? "pickup" : "assigned";
      const Point position = interpolate(seed.route, progress);
      const int speed = static_cast<int>(std::round(18 + std::sin(tick / 8.0 + index) * 7 + index * 2));
      const int eta = std::max(1, static_cast<int>(std::round((1 - progress) * 28 + delay)));

      if (index > 0) {
        std::cout << ",";
      }
      std::cout << "{\"id\":\"RS-" << (101 + index) << "\",\"driver\":\"" << seed.driver << "\",\"passenger\":\""
                << seed.passenger << "\",\"vehicle\":\"" << seed.vehicle << "\",\"state\":\"" << state << "\",\"position\":";
      writePoint(std::cout, position);
      std::cout << ",\"pickup\":";
      writePoint(std::cout, seed.route.front());
      std::cout << ",\"dropoff\":";
      writePoint(std::cout, seed.route.back());
      std::cout << ",\"route\":[";
      for (size_t routeIndex = 0; routeIndex < seed.route.size(); ++routeIndex) {
        if (routeIndex > 0) {
          std::cout << ",";
        }
        writePoint(std::cout, seed.route[routeIndex]);
      }
      std::cout << "],\"routeProgress\":" << progress << ",\"speedMph\":" << speed << ",\"etaMinutes\":" << eta
                << ",\"delayMinutes\":" << delay << ",\"updatedAt\":\"" << timestamp << "\"}";
    }
    std::cout << "]}" << std::endl;
    ++tick;
    std::this_thread::sleep_for(std::chrono::seconds(1));
  }
}
